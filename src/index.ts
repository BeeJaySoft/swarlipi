/**
 * Swarlipi — fontless Bhatkhande notation renderer (issue #310 alternate route).
 *
 * Framework-agnostic: turns an internal notation string into an HTML string
 * (SSR-safe, no DOM access; text tokens are escaped, so untrusted input is
 * safe). Consumers drop the output into an element carrying
 * `swarlipiWrapperClass(lang)` (via v-html / innerHTML / any framework) and
 * include `swarlipi/style.css`. Sizing is pure em (scales with
 * font-size), colors use currentColor, letter fonts are the consumer's
 * choice (the CSS defaults to Noto script faces but does not fetch them).
 *
 * Renders real Unicode script text (Gurmukhi / Devanagari / Bengali / Latin)
 * with every notation mark drawn by markup instead of a custom font:
 *
 *   - komal (internal R/G/D/N)  → underline under the letter (CSS)
 *   - tivra (internal M)        → short vertical bar above the letter
 *   - octave l/L/u/U            → dot(s) below / above the letter
 *   - kan {x}                   → superscript (parsed via splitKanSegments,
 *                                 the canonical kan reader)
 *   - chhand @#$%^&* `!~        → a tapered arc outline stretched under
 *                                 the next N slots (reflow-proof, no JS)
 *   - meend q(w..)e             → q/e hook outlines + a stretched bar;
 *                                 W ticks the covered note
 *   - ghaseet Q..E              → square-cornered top bracket
 *   - strokes ; ' [ ] \         → script bol syllables (da ra daa raa dir)
 *   - murki (x)                 → parentheses
 *   - digits                    → script-native numerals
 *   - `_`                       → long sustain dash
 *
 * Letter forms follow the Bhatkhande convention: single letters, except
 * Re (रे / ਰੇ / রে) and Ni (नी / ਨੀ / নী) which carry their vowel matra.
 * An unknown `lang` falls back to English rather than throwing — the value
 * can come from an unvalidated cookie during SSR.
 */

import tables from './tables.json';

// ---------------------------------------------------------------------------
// Standalone: the three tiny helpers this renderer shares with @np/notation
// are inlined here so the package has zero runtime dependencies. Keep them in
// sync with `@np/notation` (kan.ts / notation.ts / roman.ts) — they define
// the storage grammar, not rendering policy.

interface KanSegment {
  type: 'kan' | 'main';
  value: string;
}

/**
 * Split a beat string into ordered kan/main segments — `'{p}n{d}n'` →
 * `[kan 'p', main 'n', kan 'd', main 'n']`; `null` when the beat has no kan.
 * Empty main runs are omitted. Malformed input (unterminated `{`) yields no
 * kan match and therefore `null`, so it renders as literal text.
 */
function splitKanSegments(notes: string): KanSegment[] | null {
  if (!notes || !notes.includes('{')) return null;
  const segments: KanSegment[] = [];
  const regex = /\{([^}]+)\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = regex.exec(notes)) !== null) {
    found = true;
    if (match.index > last)
      segments.push({ type: 'main', value: notes.slice(last, match.index) });
    segments.push({ type: 'kan', value: match[1]! });
    last = match.index + match[0].length;
  }
  if (!found) return null;
  if (last < notes.length)
    segments.push({ type: 'main', value: notes.slice(last) });
  return segments;
}

/** Chhand subdivision symbols, indexed by (slot count − 2): `@`=2 … `*`=8. */
const CHHAND_SYMBOLS = ['@', '#', '$', '%', '^', '&', '*'] as const;

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type SwarlipiScript = 'punjabi' | 'hindi' | 'bangla' | 'english';

/** Letterforms, mizrab bols and numerals per script. */
const LETTERS = tables.letters as Record<
  SwarlipiScript,
  Record<string, string>
>;
/**
 * Vowel signs that render BEFORE their consonant, so the consonant lands in
 * the RIGHT half of the cluster (Bengali রে). Enumerated because Unicode's
 * Indic positional category is not exposed to JS, and the category alone
 * cannot separate them: a pre-base sign and a post-base one are both Mc.
 */
const PREBASE_MATRA =
  /[\u093F\u09BF\u09C7\u09C8\u0A3F\u0ABF\u0B47\u0BC6-\u0BC8]/;
/**
 * Any SPACING combining mark — one that adds advance, so it takes up half of
 * the cluster. The above-base signs on ਰੇ and रे are Mn and add nothing, which
 * is why those two need no shift at all.
 */
const SPACING_MATRA = /\p{Mc}/u;

const BOLS = tables.bols as Record<SwarlipiScript, Record<string, string>>;
const DIGITS = tables.digits as Record<SwarlipiScript, string>;
/** Characters that render as a different glyph: the two dashes. */
const TEXT = tables.text as Record<string, string>;

/**
 * Classes for the element that receives renderSwarlipi() output —
 * activates the swarlipi.css rules and the per-script mark calibration.
 */
export function swarlipiWrapperClass(lang: SwarlipiScript): string {
  return `sl-wrap sl-${lang}`;
}

// Mizrab ke bol (strokes): ; ' [ ] \  →  da ra daa raa dir.

// Chhand subdivision symbol → number of following slots its arc spans.
// Derived from the canonical CHHAND_SYMBOLS order (index + 2), plus the
// "lower" 4/6/8 variants which only exist as typed input.
const CHHAND_COUNT: Record<string, number> = Object.fromEntries([
  ...CHHAND_SYMBOLS.map((symbol, index) => [symbol, index + 2] as const),
  ['`', 4],
  ['!', 6],
  ['~', 8],
]);

const SWARA_CHAR = /[sSrRgGmMpPdDnN]/;
const OCTAVE_CHAR = /[lLuU]/;

// Structural tokens — the ONE reading of the notation grammar. tokenToHtml
// and tokenToText are two emitters over the same stream, so the rendered
// beat and its clipboard text can never disagree on what a beat contains.
// Every token carries its source range [s, e) in the notation string, and the
// HTML emitter stamps it on the rendered element (`data-s`/`data-e`) so an
// editor can map a caret index in the raw text to a position among the
// rendered glyphs — the raw ASCII and the rendered marks have different widths.
type Span = { s: number; e: number };
type Token = Span &
  (
    | { kind: 'note'; swara: string; octave?: string; stroke: boolean }
    | { kind: 'dash' }
    | { kind: 'kan'; inner: Token[] }
    | { kind: 'bol'; ch: string; dir: boolean }
    | { kind: 'text'; ch: string }
    | { kind: 'chhand'; count: number; lower: boolean }
    | { kind: 'meend-open'; ghaseet: boolean }
    | { kind: 'meend-close'; ghaseet: boolean }
    | { kind: 'meend-cont'; stroke?: boolean }
  );

// Octave dots are SVG circles, not border-drawn boxes: a 0.15em border ring
// snaps per side at print sizes (some dots 2px, some 3px, some hollow), while
// a vector fill anti-aliases as one shape at any size and prints without
// "background graphics".
const DOT_SVG =
  '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5"/></svg>';
// Bars (tivra, W tick) are SVG rects for the same reason: a border edge snaps
// per side at print sizes, a vector fill does not.
const BAR_SVG =
  '<svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><rect width="1" height="1"/></svg>';
function dotSvg(side: 'a' | 'b', extra = ''): string {
  return `<span class="sl-dot sl-dot-${side}${extra ? ` ${extra}` : ''}">${DOT_SVG}</span>`;
}

/** Octave dots for a modifier char — `u`/`l` one, `U`/`L` the ati pair. */
function octaveMarks(octave: string): string {
  if (octave === 'u') return dotSvg('a');
  if (octave === 'U') return dotSvg('a', 'sl-p1') + dotSvg('a', 'sl-p2');
  if (octave === 'l') return dotSvg('b');
  if (octave === 'L') return dotSvg('b', 'sl-p1') + dotSvg('b', 'sl-p2');
  return '';
}

function noteHtml(
  swara: string,
  octave: string | undefined,
  ctx: Ctx,
  meendStroke = false,
  attrs = ''
): string {
  const lang = ctx.lang;
  const isKomal = 'RGDN'.includes(swara);
  const isTivra = swara === 'M';
  const letter = LETTERS[lang][swara.toLowerCase()] ?? escapeHtml(swara);
  // Which half of the cluster the consonant occupies — the octave dot, the W
  // tick and the komal underline all mark the CONSONANT, not the full
  // letter+matra width. DERIVED from the letter, not named per script: the
  // spelling in tables.json already carries the answer, and hard-coding it
  // meant adding a script required editing the table AND a boolean in here,
  // with nothing linking the two. Miss the second and the mark silently
  // centres on the wrong half, which is exactly how Bangla Re was wrong.
  const hasLeadingMatra = PREBASE_MATRA.test(letter);
  const hasTrailingMatra = !hasLeadingMatra && SPACING_MATRA.test(letter);

  // Ati (double) octaves render TWO real dot elements — identical siblings
  // can never misalign, unlike a pseudo-element twin.
  let marks = '';
  if (isTivra) marks += `<i class="sl-tivra">${BAR_SVG}</i>`;
  if (meendStroke) marks += `<i class="sl-mtick">${BAR_SVG}${BAR_SVG}</i>`;
  if (octave) marks += octaveMarks(octave);

  const extra = ctx.noteClass?.(swara, octave);
  const cls = `sl-n${isKomal ? ' sl-komal' : ''}${hasTrailingMatra ? ' sl-mat' : ''}${hasLeadingMatra ? ' sl-matp' : ''}${extra ? ` ${extra}` : ''}`;
  return `<span class="${cls}"${attrs}>${letter}${marks}</span>`;
}

/**
 * Kan is parsed with splitKanSegments — the canonical reader — so malformed
 * input (unterminated `{`, empty `{}`) renders as literal text exactly like
 * the font and Roman paths, instead of silently inventing a kan.
 */
function tokenize(notes: string): Token[] {
  // The W stroke flag must survive kan boundaries (`sW{r}g` ticks the g), so
  // it lives here and threads through every segment run.
  const state = { meendStrokeNext: false };

  const segments = splitKanSegments(notes);
  const tokens: Token[] = [];
  if (!segments) tokens.push(...tokenizeRun(notes, state));
  else {
    // Segments come without offsets; walk them to recover each one's start.
    let at = 0;
    for (const segment of segments) {
      if (segment.type === 'kan') {
        // `{…}` — the braces are part of the kan's source range.
        const inner = tokenizeRun(segment.value, undefined, at + 1);
        const e = at + segment.value.length + 2;
        if (inner.length) tokens.push({ kind: 'kan', inner, s: at, e });
        at = e;
      } else {
        tokens.push(...tokenizeRun(segment.value, state, at));
        at += segment.value.length;
      }
    }
  }
  // A `W` with no note AFTER it still marks a struck note. Give the stroke to
  // the note BEFORE it if there is one, so `rW` and `Wr` end up structurally
  // identical — one emitter (noteHtml), tick inside the note, which is what
  // lets the per-note rules (`.sl-mat:has(.sl-mtick)`, the lift tiers) see it
  // whichever side the marker was typed. Only a beat with no note at all
  // falls back to the marker's own piece.
  if (state.meendStrokeNext) {
    const reversed = [...tokens].reverse();
    const note = reversed.find((t) => t.kind === 'note');
    if (note && note.kind === 'note') note.stroke = true;
    else {
      const marker = reversed.find((t) => t.kind === 'meend-cont');
      if (marker && marker.kind === 'meend-cont') marker.stroke = true;
    }
  }
  return tokens;
}

function tokenizeRun(
  notes: string,
  state: { meendStrokeNext: boolean } = { meendStrokeNext: false },
  base = 0
): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < notes.length) {
    const ch = notes[i]!;
    const s = base + i;

    if (CHHAND_COUNT[ch] !== undefined) {
      // Lower variants (` ! ~) exist to enclose inner groups (layakari) —
      // their scan reaches through inner chhand symbols.
      tokens.push({
        kind: 'chhand',
        count: CHHAND_COUNT[ch]!,
        lower: ch === '`' || ch === '!' || ch === '~',
        s,
        e: s + 1,
      });
      i += 1;
      continue;
    }

    if (ch === 'q' || ch === 'Q') {
      tokens.push({ kind: 'meend-open', ghaseet: ch === 'Q', s, e: s + 1 });
      i += 1;
      continue;
    }
    if (ch === 'e' || ch === 'E') {
      tokens.push({ kind: 'meend-close', ghaseet: ch === 'E', s, e: s + 1 });
      i += 1;
      continue;
    }
    if (ch === 'w' || ch === 'W') {
      // Meend continue — a bar fragment over the note it precedes; `W` also
      // marks that note with a stroke tick.
      tokens.push({ kind: 'meend-cont', s, e: s + 1 });
      if (ch === 'W') state.meendStrokeNext = true;
      i += 1;
      continue;
    }

    if (SWARA_CHAR.test(ch)) {
      const next = notes[i + 1];
      const octave = next && OCTAVE_CHAR.test(next) ? next : undefined;
      tokens.push({
        kind: 'note',
        swara: ch,
        octave,
        stroke: state.meendStrokeNext,
        s,
        e: s + (octave ? 2 : 1),
      });
      state.meendStrokeNext = false;
      i += octave ? 2 : 1;
      continue;
    }

    if (ch === '-') {
      tokens.push({ kind: 'dash', s, e: s + 1 });
      i += 1;
      continue;
    }

    if (BOLS.english[ch] !== undefined) {
      // Dir spans two note-slots and carries the chhand swoosh under it.
      tokens.push({ kind: 'bol', ch, dir: ch === '\\', s, e: s + 1 });
      i += 1;
      continue;
    }

    // Digits, `_`, and anything unrecognised pass through as text.
    tokens.push({ kind: 'text', ch, s, e: s + 1 });
    i += 1;
  }
  return tokens;
}

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9';

const src = (t: Span): string => ` data-s="${t.s}" data-e="${t.e}"`;

function tokenToHtml(token: Token, ctx: Ctx): string {
  const lang = ctx.lang;
  switch (token.kind) {
    case 'note':
      return noteHtml(token.swara, token.octave, ctx, token.stroke, src(token));
    case 'kan': {
      const inner = token.inner.map((t) => tokenToHtml(t, ctx)).join('');
      return `<sup class="sl-kan"${src(token)}>${inner}</sup>`;
    }
    case 'bol':
      return `<span class="sl-bol${token.dir ? ' sl-dir' : ''}"${src(token)}>${
        BOLS[lang][token.ch]
      }${token.dir ? arcSvg(2) : ''}</span>`;
    case 'dash':
      return `<span class="sl-n sl-dash"${src(token)}>${TEXT['-']}</span>`;
    case 'text': {
      // An octave modifier only means something ON a note: it is typed after
      // the swara and consumed with it, and its dot is positioned against
      // that letter's box. On its own it draws nothing at all — but it must
      // never leak as a raw `u`/`l` either. (`,` `(` `)` `-` `_` and digits
      // are real notation that prints.)
      if (OCTAVE_CHAR.test(token.ch)) return '';
      // A brace the kan parser didn't consume (`{m` mid-typing, or a
      // malformed pair) stays literal — see the malformed-kan spec — dimmed
      // as `.sl-brace` so an open kan reads as in progress, not as text.
      if (token.ch === '{' || token.ch === '}')
        return `<span class="sl-brace"${src(token)}>${token.ch}</span>`;
      const text = isDigit(token.ch)
        ? DIGITS[lang][token.ch.charCodeAt(0) - 48]!
        : (TEXT[token.ch] ?? escapeHtml(token.ch));
      return `<span class="sl-t"${src(token)}>${text}</span>`;
    }
    case 'chhand':
    case 'meend-open':
    case 'meend-close':
    case 'meend-cont':
      return '';
  }
}

// Plain-text twin of tokenToHtml: real combining diacritics instead of <i>
// marks, kan as parentheses, no form for chhand/meend markers.
function tokenToText(token: Token, lang: SwarlipiScript): string {
  switch (token.kind) {
    case 'note': {
      const { swara, octave } = token;
      // Marks go AFTER the whole letter cluster (consonant + matra). A Latin
      // combining mark between ਰ and ੇ splits the Indic syllable in most text
      // engines (Word, Notes, WhatsApp): the vowel sign then renders on a
      // dotted circle — the "weird characters" report. After the cluster the
      // shaper keeps the syllable intact and centers the mark over it.
      const letter = LETTERS[lang][swara.toLowerCase()] ?? swara;
      let marks = '';
      if ('RGDN'.includes(swara)) marks += COMBINING.komal;
      if (swara === 'M') marks += COMBINING.tivra;
      if (octave === 'u') marks += COMBINING.taar;
      if (octave === 'U') marks += COMBINING.atiTaar;
      if (octave === 'l') marks += COMBINING.mandra;
      if (octave === 'L') marks += COMBINING.atiMandra;
      return letter + marks;
    }
    case 'kan':
      return `(${token.inner.map((t) => tokenToText(t, lang)).join('')})`;
    case 'bol':
      return BOLS[lang][token.ch]!;
    case 'dash':
      return TEXT['-']!;
    case 'text':
      // A bare octave modifier has no form of its own (see above).
      if (OCTAVE_CHAR.test(token.ch)) return '';
      if (isDigit(token.ch)) return DIGITS[lang][token.ch.charCodeAt(0) - 48]!;
      return TEXT[token.ch] ?? token.ch;
    case 'chhand':
    case 'meend-open':
    case 'meend-close':
    case 'meend-cont':
      return '';
  }
}

// The chhand swoosh outline, normalized to a 100×12 box. Non-uniform
// preserveAspectRatio=none stretch is intentional — the browser re-derives
// the width at any layout size with zero JS. Height grows a little with the
// slot count so long arcs keep visible curvature; the seven variants are
// precomputed once.
const CHAND_PATH =
  'M98.01 0.0H100.0Q95.92 3.26 90.43 5.47Q82.64 8.6 72.04 10.3Q61.44 12.0 50.06 12.0' +
  'Q33.41 12.0 19.68 8.67Q5.94 5.34 0.0 0.0H2.28Q5.94 2.67 12.28 4.39Q18.62 6.11 28.35 6.95' +
  'Q38.09 7.8 48.67 7.8Q60.18 7.8 69.57 7.08Q76.99 6.51 81.48 5.7Q85.97 4.9 90.09 3.54Q94.22 2.19 98.01 0.0Z';

const ARC_SVGS: Record<number, string> = Object.fromEntries(
  [2, 3, 4, 5, 6, 7, 8].map((count) => {
    const height = Math.min(0.22 + count * 0.028, 0.4);
    return [
      count,
      `<svg class="sl-arc" style="height:${height}em" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">` +
        `<path d="${CHAND_PATH}"/></svg>`,
    ];
  })
);

function arcSvg(count: number): string {
  return ARC_SVGS[Math.min(Math.max(count, 2), 8)]!;
}

// Meend marks are the q / e / w outlines, drawn in one shared vertical frame
// (so the hook-vs-bar proportions stay true) and normalized to 100×12 boxes. The hooks render at
// a fixed em size; only the connecting bar stretches — so the rounded curl
// never distorts at any span width. Ghaseet uses square bracket pieces
// (bordered elements) instead of the rounded hooks.
const MK_Q_PATH =
  'M100.0 0.19V4.4L99.31 4.5Q62.84 4.5 40.69 5.6Q23.22 6.4 15.17 9.4Q12.95 12.0 11.72 12.0H0.69' +
  'L0.0 11.91Q0.0 8.73 15.17 5.76Q50.19 0.0 97.93 0.0Q100.0 0.0 100.0 0.19Z';
const MK_E_PATH =
  'M2.07 0.0Q49.81 0.0 84.83 5.76Q100.0 8.73 100.0 11.91L99.31 12.0H88.28Q87.05 12.0 84.83 9.4' +
  'Q76.78 6.4 59.31 5.6Q37.16 4.5 0.69 4.5L0.0 4.4V0.19Q0.0 0.0 2.07 0.0Z';
// Shared vertical frame for all three outlines.
const MK_FRAME_UNITS = 12;
// Bar band: the top 4.5 of the frame. The hooks' inner edges leave their join
// at the same 4.5 (the `4.5`/`4.4` pairs above) so the stroke keeps one weight
// from curl to curl.
const MK_BAR_UNITS = 4.5;
// The bar's ends step in by this much so a piece butting against the next
// fragment shows no corner.
const MK_CHAMFER = 0.19;
/**
 * Fraction of a mark zone's height taken by the glide's bar — the single
 * source for the stroke weight. Consumed by the W path below, by the
 * stylesheet's `--sl-bar-ratio` (guarded by a test in swarlipi.spec.ts), and
 * by the app overlay's cross-beat bridge slab, so a fragment bar and the
 * bridge continuing it can never disagree on thickness.
 */
export const MEEND_BAR_RATIO = MK_BAR_UNITS / MK_FRAME_UNITS;

const MK_W_PATH =
  `M1.1 0.0H98.9L100.0 ${MK_CHAMFER}V${MK_BAR_UNITS - MK_CHAMFER}` +
  `L98.9 ${MK_BAR_UNITS}H1.1L0.0 ${MK_BAR_UNITS - MK_CHAMFER}V${MK_CHAMFER}Z`;

const MK_SVG = (cls: string, path: string) =>
  `<svg class="sl-mk ${cls}" viewBox="0 0 100 ${MK_FRAME_UNITS}" preserveAspectRatio="none" aria-hidden="true"><path d="${path}"/></svg>`;

/** Meend mark zone: optional left hook, stretched bar, optional right hook. */
function meendZone(left: boolean, right: boolean): string {
  const barCls = `sl-mk-b${left ? ' sl-has-l' : ''}${right ? ' sl-has-r' : ''}`;
  return (
    '<i class="sl-mz">' +
    (left ? MK_SVG('sl-mk-l', MK_Q_PATH) : '') +
    MK_SVG(barCls, MK_W_PATH) +
    (right ? MK_SVG('sl-mk-r', MK_E_PATH) : '') +
    '</i>'
  );
}

type FragKind =
  | 'start'
  | 'cont'
  | 'end'
  | 'gstart'
  | 'gend'
  | 'full'
  | 'ghaseet';

const FRAG_SVG: Record<FragKind, string> = {
  start: meendZone(true, false),
  cont: meendZone(false, false),
  end: meendZone(false, true),
  // Ghaseet pieces: square bracket sides via bordered elements.
  gstart: '<i class="sl-mbr sl-open-r"></i>',
  gend: '<i class="sl-mbr sl-open-l"></i>',
  full: meendZone(true, true),
  ghaseet: '<i class="sl-mbr"></i>',
};

function fragWrap(html: string, kind: FragKind): string {
  return `<span class="sl-meend">${html}${FRAG_SVG[kind]}</span>`;
}

// A marker with no note left in the beat (a lone `w` continuation beat, or a
// trailing q/e) still draws its bracket piece — over an empty note-width
// placeholder, the way the font draws the bare glyph.
const FRAG_PLACEHOLDER = '<span class="sl-n sl-ph"> </span>';
/** Closing tag of a fragment piece, so a second marker can reach inside it. */
const CLOSE_TAG = '</span>';

function fragKindOf(
  token: Token & { kind: 'meend-open' | 'meend-close' | 'meend-cont' }
): FragKind {
  if (token.kind === 'meend-cont') return 'cont';
  if (token.kind === 'meend-open') return token.ghaseet ? 'gstart' : 'start';
  return token.ghaseet ? 'gend' : 'end';
}

/**
 * A cross-beat fragment wraps the note the glide leaves from or arrives at, so
 * its hook starts at that note's edge and costs NO inline width — the same
 * shape an in-beat pair already renders. `anchor` is that note's html; only a
 * beat with no note at all (a bare `w` continuation) falls back to the
 * placeholder, which exists to give the zone a letter-height line box.
 */
function fragPiece(
  marker: Token & { kind: 'meend-open' | 'meend-close' | 'meend-cont' },
  anchor = '',
  deferred = ''
): string {
  // The tick is a SIBLING of the zone, not a child of the placeholder: both
  // are then positioned against the same box, so the tick hangs from the bar's
  // underside by construction. Nested in the placeholder it resolved its offset
  // against that inline-block instead, landing ~0.7em below the bar.
  // sl-pc bleeds the bar edge-to-edge, which is what makes adjacent note-less
  // pieces (`q w e`) read as one stroke. Over a real note the zone insets like
  // any other wrap, so the hook meets the letter instead of a blank box.
  const tick =
    marker.kind === 'meend-cont' && marker.stroke
      ? `<i class="sl-mtick">${BAR_SVG}${BAR_SVG}</i>`
      : '';
  const cls = anchor ? 'sl-meend' : 'sl-meend sl-pc';
  // `deferred` holds zones from markers typed BEFORE this note that had
  // nothing to hook onto yet (`eqg`); they precede this marker's own zone so
  // the drawn order still matches the typed order.
  return `<span class="${cls}">${anchor || FRAG_PLACEHOLDER}${deferred}${FRAG_SVG[fragKindOf(marker)]}${tick}</span>`;
}

/**
 * Does the span starting at `from` hold any note/dash between its markers?
 * A pair with an EMPTY interior (`sqem`, `qe`) renders as adjacent stream
 * pieces — hook rising after the previous note, hook landing before the
 * next — rather than an arch, so the glide reads directionally, "from s
 * to m", the way the same pair does across two beats.
 */
/**
 * One forward walk answering both questions an opener needs: where its close
 * is, and whether anything glide-worthy sits between the two. A second opener
 * or a chhand symbol ends this glide's reach — a span never threads through
 * either — and both answers stop at the same barrier, which is why they share
 * a scan rather than each making their own.
 */
interface SpanScan {
  /** Index of the matching close, or -1. */
  close: number;
  /** Does a note or dash sit between the markers? */
  hasSlots: boolean;
}
function scanSpan(tokens: Token[], from: number, end: number): SpanScan {
  let hasSlots = false;
  for (let j = from + 1; j < end; j++) {
    const k = tokens[j]!.kind;
    if (k === 'meend-close') return { close: j, hasSlots };
    if (k === 'meend-open' || k === 'chhand') break;
    if (k === 'note' || k === 'dash') hasSlots = true;
  }
  return { close: -1, hasSlots };
}

/** A token a glide can land its hook on — anything that occupies a slot. A kan
 *  is NOT one: it ornaments the note after it, and the glide belongs to that
 *  note, so the hook sits on the note and the kan stays outside the wrap. */
const ANCHORABLE = new Set(['note', 'dash']);
/** The three cross-beat marker kinds. */
const MARKER_KINDS = new Set(['meend-open', 'meend-close', 'meend-cont']);

/**
 * Render an internal notation string as swarlipi HTML for the given script.
 * A chhand symbol wraps its following N slots. A q..e pair CLOSED WITHIN the
 * beat wraps its notes in the hook-and-bar arch (Q..E: square ghaseet
 * bracket); unmatched q / w / e pieces of a cross-beat span decorate their
 * following note as start / continue / end fragments.
 */
// Combining marks for the plain-text (clipboard) form of the notation:
// real Unicode diacritics, so copied notes carry their octave dots, komal
// underline, and tivra bar as text.
const COMBINING = {
  komal: '̱', // combining macron below
  tivra: '̍', // combining vertical line above
  taar: '̇', // combining dot above
  atiTaar: '̈', // combining diaeresis (two dots above)
  mandra: '̣', // combining dot below
  atiMandra: '̤', // combining diaeresis below (two dots)
} as const;

/**
 * Plain-text Unicode form of a notation string — for clipboard/copy: letters
 * in the script plus REAL combining diacritics (dots above/below, komal low
 * line, tivra vertical line above). Kan renders as parentheses; chhand and
 * meend markers have no Unicode form and are omitted; bols and digits use
 * their script forms.
 */
export function toUnicodeNotation(notes: string, lang: SwarlipiScript): string {
  if (!notes) return '';
  const safeLang: SwarlipiScript = LETTERS[lang] ? lang : 'english';
  return tokenize(notes)
    .map((t) => tokenToText(t, safeLang))
    .join('');
}

export interface SwarlipiRenderOptions {
  /**
   * Extra class(es) for a note's `.sl-n` span — the host's hook for raga
   * highlighting (vadi / samvadi) or any per-note styling. Marks inherit the
   * note's color via currentColor, so a colored class colors the whole note.
   */
  noteClass?: (swara: string, octave?: string) => string | undefined;
  /**
   * Editor mode: a chhand symbol with no notes under it yet draws its full
   * mark over empty slots, so a half-typed `@` is visible and sized like the
   * real thing. Read views leave it out — a stray marker in a published
   * composition is noise. (An octave modifier draws nothing either way: its
   * dot only means something on a note.)
   */
  editing?: boolean;
}

interface Ctx {
  lang: SwarlipiScript;
  noteClass?: SwarlipiRenderOptions['noteClass'];
  editing?: boolean;
}

export function renderSwarlipi(
  notes: string,
  lang: SwarlipiScript,
  options: SwarlipiRenderOptions = {}
): string {
  if (!notes) return '';
  // The language can come from an unvalidated cookie during SSR — degrade to
  // English rather than throwing on an unknown key.
  const safeLang: SwarlipiScript = LETTERS[lang] ? lang : 'english';
  const tokens = tokenize(notes);
  return assemble(tokens, 0, tokens.length, {
    lang: safeLang,
    noteClass: options.noteClass,
    editing: options.editing,
  }).html;
}

function assemble(
  tokens: Token[],
  start: number,
  end: number,
  ctx: Ctx
): { html: string; next: number } {
  let html = '';
  // Markers can TRAIL their note (`sq`, `ne`, `sqem`) as well as lead it —
  // track where the last emitted note's html starts so a marker can pull it
  // back inside its wrap.
  let lastNoteAt = -1;
  // Where the last note-anchored fragment piece ENDS in `html`, so a second
  // marker on the same note can add its zone to that piece (see `geq`). -1
  // whenever the previous emission was anything else.
  let lastPieceAt = -1;
  // Zones from markers typed before their note, held until it turns up.
  let deferredZones = '';
  let i = start;
  while (i < end) {
    const token = tokens[i]!;

    if (token.kind === 'chhand') {
      // Scope the group FIRST — scan forward until `count` note/dash slots
      // are consumed (or the next chhand symbol) — then render its contents
      // with a recursive assemble() call. One shared code path means meend
      // handling can never diverge between grouped and ungrouped beats, and
      // hasClose/assembleMeend are naturally bounded by the group, so an arc
      // can't stretch past its declared slot count.
      let slots = 0;
      let j = i + 1;
      while (j < end && slots < token.count) {
        const t = tokens[j]!;
        if (t.kind === 'chhand' && !token.lower) break;
        if (t.kind === 'note' || t.kind === 'dash') slots += 1;
        // Bols occupy a slot; dir spans two.
        if (t.kind === 'bol') slots += t.dir ? 2 : 1;
        j += 1;
      }
      // A marker riding the last slot (`@qsre`, `$srgmq`) belongs to the group
      // too — otherwise a matched pair splits into cross-beat fragments around
      // the arc, and a trailing opener lands OUTSIDE the group where it can no
      // longer reach back to the note it should hook onto.
      while (
        j < end &&
        (tokens[j]!.kind === 'meend-close' ||
          tokens[j]!.kind === 'meend-open' ||
          tokens[j]!.kind === 'meend-cont')
      )
        j += 1;
      const group = assemble(tokens, i + 1, j, ctx).html;
      // Nothing to cover yet (`@` on its own, mid-entry): while editing, draw
      // the arc over as many empty slots as the symbol declares, so it reads
      // as the FULL mark for what was typed — `@` two wide, `#` three, `*`
      // eight — and the counts stay distinguishable. (Over a single slot the
      // arc squeezes to ~10px and `@`/`#`/`$` differ only by fractions of a
      // pixel in height, since the count is encoded in height alone.) A read
      // view omits it; a stray marker in a published composition is noise.
      const covered =
        group || (ctx.editing ? FRAG_PLACEHOLDER.repeat(token.count) : '');
      html += covered
        ? `<span class="sl-ch">${covered}${arcSvg(token.count)}</span>`
        : '';
      lastNoteAt = -1;
      lastPieceAt = -1;
      i = j;
      continue;
    }

    const scan =
      token.kind === 'meend-open'
        ? scanSpan(tokens, i, end)
        : { close: -1, hasSlots: false };
    // An empty-interior pair still spans a real glide when a note sits either
    // side of it (`sqem`), so it wraps those exactly as `qsme` does instead of
    // drawing into a placeholder box between them.
    const touchesNote =
      lastNoteAt >= 0 ||
      (scan.close >= 0 &&
        scan.close + 1 < end &&
        ANCHORABLE.has(tokens[scan.close + 1]!.kind));
    if (
      token.kind === 'meend-open' &&
      scan.close >= 0 &&
      (scan.hasSlots || touchesNote)
    ) {
      let leading = '';
      if (lastNoteAt >= 0) {
        leading = html.slice(lastNoteAt);
        html = html.slice(0, lastNoteAt);
      }
      const sub = assembleMeend(tokens, i, end, ctx, leading);
      html += sub.html;
      lastNoteAt = -1;
      lastPieceAt = -1;
      i = sub.next;
      continue;
    }
    if (token.kind === 'meend-open' && scan.close >= 0) {
      // Matched pair with an empty interior AND no note on either side
      // (`qe` alone, mid-edit): nothing to anchor to, so both hooks join over
      // a single placeholder slot. With a note adjacent the branch above
      // wraps it instead, which is what keeps `sqem` identical to `qsme`.
      let j = i + 1;
      let between = '';
      while (tokens[j]!.kind !== 'meend-close') {
        // Bols/digits between the markers (`q;e`) are not glide slots but
        // must not vanish.
        if (tokens[j]!.kind !== 'meend-cont')
          between += tokenToHtml(tokens[j]!, ctx);
        j += 1;
      }
      html += `<span class="sl-meend sl-pc">${FRAG_PLACEHOLDER}${
        FRAG_SVG[token.ghaseet ? 'ghaseet' : 'full']
      }</span>${between}`;
      lastNoteAt = -1;
      lastPieceAt = -1;
      i = j + 1;
      continue;
    }
    if (
      token.kind === 'meend-open' ||
      token.kind === 'meend-cont' ||
      token.kind === 'meend-close'
    ) {
      // Anchor to the slot this marker belongs to: the one before it for a
      // trailing form (`sq`), the one after it for a leading form (`qs`).
      // Either spelling starts the glide at that same note, which is why the
      // two must draw the same picture. A kan or a dash anchors as readily as
      // a bare note — `q{m}s` and `s-q` are glides too.
      let anchor = '';
      if (lastNoteAt >= 0) {
        anchor = html.slice(lastNoteAt);
        html = html.slice(0, lastNoteAt);
      } else if (i + 1 < end) {
        // Look forward for the slot this glide lands on, stepping OVER any kan
        // on the way: a kan ornaments its note and the glide belongs to the
        // note, so the kan is emitted before the wrap and the hook sits on the
        // note itself. That also makes `q{m}s` and `{m}sq` render alike.
        let j = i + 1;
        let ornament = '';
        while (j < end && tokens[j]!.kind === 'kan') {
          ornament += tokenToHtml(tokens[j]!, ctx);
          j += 1;
        }
        if (j < end && ANCHORABLE.has(tokens[j]!.kind)) {
          html += ornament;
          anchor = tokenToHtml(tokens[j]!, ctx);
          i = j; // the loop's own i += 1 steps past the slot
        }
      }
      if (!anchor && MARKER_KINDS.has(tokens[i + 1]?.kind ?? '')) {
        // Another marker follows and this one has no note yet — `eqg`, the
        // guide's marker-first spelling of a beat whose note ends one glide
        // and starts the next. Hold this zone until that marker reaches the
        // note, so both glides meet the letter instead of one of them drawing
        // over a blank box beside it.
        deferredZones += FRAG_SVG[fragKindOf(token)];
        i += 1;
        continue;
      }
      if (!anchor && lastPieceAt >= 0) {
        // A boundary beat (`geq`) closes one glide and opens the next ON THE
        // SAME note. The note is already inside the previous piece, so add
        // this marker's zone to that piece rather than drawing it over a blank
        // box beside the letter — both glides then start and end on the note,
        // and the overlay finds the two zones in marker order.
        html =
          html.slice(0, -CLOSE_TAG.length) +
          FRAG_SVG[fragKindOf(token)] +
          CLOSE_TAG;
        i += 1;
        continue;
      }
      html += fragPiece(token, anchor, deferredZones);
      deferredZones = '';
      lastPieceAt = anchor ? html.length : -1;
      lastNoteAt = -1;
      i += 1;
      continue;
    }

    // A dash holds a slot, so a glide can leave from one (`s-q`).
    if (token.kind === 'note' || token.kind === 'dash')
      lastNoteAt = html.length;
    else lastNoteAt = -1;
    lastPieceAt = -1;
    html += tokenToHtml(token, ctx);
    i += 1;
  }
  return { html, next: i };
}

function assembleMeend(
  tokens: Token[],
  start: number,
  end: number,
  ctx: Ctx,
  leadingInner = ''
): { html: string; next: number; slots: number } {
  const open = tokens[start]! as { kind: 'meend-open'; ghaseet: boolean };
  // Trailing-form opener (`sq…`): the note before the marker starts the
  // glide and rides inside the wrap (already slot-counted by the caller).
  let inner = leadingInner;
  let slots = 0;
  let i = start + 1;
  while (i < end) {
    const t = tokens[i]!;
    if (t.kind === 'meend-close') {
      // The closer's note (the glide target) is part of the span.
      i += 1;
      if (i < end && tokens[i]!.kind === 'note') {
        inner += tokenToHtml(tokens[i]!, ctx);
        slots += 1;
        i += 1;
      }
      break;
    }
    // hasClose guarantees neither of these appears before the closer.
    if (t.kind === 'meend-open' || t.kind === 'chhand') break;
    if (t.kind === 'meend-cont') {
      i += 1;
      continue;
    }
    inner += tokenToHtml(t, ctx);
    if (t.kind === 'note' || t.kind === 'dash') slots += 1;
    i += 1;
  }
  // A marker-only span (`qe`, `qwe` mid-edit) still draws its hooks over a
  // placeholder slot — returning nothing would blank the beat during the
  // editor's live preview.
  if (!inner) inner = FRAG_PLACEHOLDER;
  return {
    html: fragWrap(inner, open.ghaseet ? 'ghaseet' : 'full'),
    next: i,
    slots,
  };
}
