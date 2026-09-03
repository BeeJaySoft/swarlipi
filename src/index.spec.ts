import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import type { SwarlipiScript } from '.';
import {
  MEEND_BAR_RATIO,
  renderSwarlipi,
  swarlipiWrapperClass,
  toUnicodeNotation,
} from '.';

describe('toUnicodeNotation', () => {
  it('emits real combining diacritics for marks', () => {
    expect(toUnicodeNotation('su', 'punjabi')).toBe('ਸ̇');
    expect(toUnicodeNotation('sU', 'punjabi')).toBe('ਸ̈');
    expect(toUnicodeNotation('Rl', 'hindi')).toBe('रे̱̣');
    // After the matra, never inside the cluster (would split the syllable).
    expect(toUnicodeNotation('nu', 'punjabi')).toBe('ਨੀ̇');
    expect(toUnicodeNotation('M', 'hindi')).toBe('म̍');
  });

  it('renders kan as parentheses and drops chhand/meend markers', () => {
    expect(toUnicodeNotation('${m}sqre', 'punjabi')).toBe('(ਮ)ਸਰੇ');
  });

  it('maps bols, digits and dashes', () => {
    expect(toUnicodeNotation(';2-_', 'hindi')).toBe('द२–—');
  });
});

describe('swarlipiWrapperClass', () => {
  it('builds wrapper classes', () => {
    expect(swarlipiWrapperClass('punjabi')).toBe('sl-wrap sl-punjabi');
    expect(swarlipiWrapperClass('hindi')).toBe('sl-wrap sl-hindi');
  });
});

describe('renderSwarlipi — letters and marks', () => {
  it('renders script letters per language', () => {
    expect(renderSwarlipi('s', 'punjabi')).toContain('ਸ');
    expect(renderSwarlipi('s', 'hindi')).toContain('स');
    expect(renderSwarlipi('s', 'bangla')).toContain('স');
    expect(renderSwarlipi('s', 'english')).toContain('S');
  });

  it('renders Re and Ni with their vowel matras', () => {
    expect(renderSwarlipi('r', 'punjabi')).toContain('ਰੇ');
    expect(renderSwarlipi('n', 'hindi')).toContain('नी');
  });

  it('marks komal with the underline class, same letter', () => {
    const html = renderSwarlipi('R', 'punjabi');
    expect(html).toContain('sl-komal');
    expect(html).toContain('ਰੇ');
  });

  it('marks tivra Ma with a bar', () => {
    expect(renderSwarlipi('M', 'hindi')).toContain('sl-tivra');
  });

  it('renders octave dots, doubled for ati octaves', () => {
    expect(renderSwarlipi('su', 'punjabi')).toContain('sl-dot-a');
    expect(renderSwarlipi('sl', 'punjabi')).toContain('sl-dot-b');
    const ati = renderSwarlipi('sU', 'punjabi');
    expect(ati).toContain('sl-p1');
    expect(ati).toContain('sl-p2');
  });

  it('tags Ni with sl-mat so dots center on the consonant (not english)', () => {
    expect(renderSwarlipi('nu', 'punjabi')).toContain('sl-mat');
    expect(renderSwarlipi('nu', 'english')).not.toContain('sl-mat');
  });

  it('escapes characters with no notation meaning', () => {
    expect(renderSwarlipi('<x>', 'punjabi')).toContain('&lt;');
    expect(renderSwarlipi('<x>', 'punjabi')).not.toContain('<x>');
  });
});

describe('renderSwarlipi — kan', () => {
  it('renders kan as a superscript before its note', () => {
    const html = renderSwarlipi('{m}s', 'punjabi');
    expect(html).toMatch(/<sup class="sl-kan"[^>]*>/);
    expect(html.indexOf('ਮ')).toBeLessThan(html.indexOf('ਸ'));
  });

  it('renders multi-note kan and keeps octave dots inside', () => {
    const html = renderSwarlipi('{nu}s', 'punjabi');
    expect(html).toContain('sl-kan');
    expect(html).toContain('sl-dot-a');
  });

  it('renders malformed kan braces as literal text (canonical parser)', () => {
    // splitKanSegments rejects these, so they render like the font path:
    // literal characters, never an invented kan.
    expect(renderSwarlipi('{sr', 'punjabi')).toContain('{');
    expect(renderSwarlipi('{sr', 'punjabi')).not.toContain('sl-kan');
    expect(renderSwarlipi('{}', 'punjabi')).not.toContain('sl-kan');
  });
});

describe('renderSwarlipi — chhand', () => {
  it('wraps the following N slots in an arc group', () => {
    const html = renderSwarlipi('@sr g', 'punjabi');
    const group = html.slice(html.indexOf('sl-ch'), html.indexOf('</svg>'));
    expect(group).toContain('ਸ');
    expect(group).toContain('ਰੇ');
    // g is outside the 2-slot group
    expect(html.slice(html.indexOf('</svg>'))).toContain('ਗ');
  });

  it('counts dashes as slots', () => {
    const html = renderSwarlipi('@s-', 'punjabi');
    expect(html).toContain('sl-ch');
    expect(html).toContain('sl-dash');
  });

  it('supports multiple groups per beat', () => {
    const html = renderSwarlipi('@sr@gm', 'punjabi');
    expect(html.match(/sl-ch/g)?.length).toBe(2);
  });

  it('emits nothing for a trailing chhand symbol with no notes', () => {
    expect(renderSwarlipi('@', 'punjabi')).toBe('');
  });
});

describe('renderSwarlipi — meend and ghaseet', () => {
  // Rendered shape WITHOUT the source offsets: those map a caret index back to
  // the raw text, so they SHOULD differ when the characters sit elsewhere.
  const shape = (notes: string, lang: SwarlipiScript = 'punjabi') =>
    renderSwarlipi(notes, lang).replace(/ data-[se]="\d+"/g, '');

  it('wraps a matched q..e span with hooks and bar', () => {
    const html = renderSwarlipi('qsre', 'punjabi');
    expect(html).toContain('sl-meend');
    expect(html).toContain('sl-mk-l');
    expect(html).toContain('sl-mk-r');
    expect(html).toContain('sl-mk-b');
  });

  it('renders ghaseet Q..E as the square bracket', () => {
    const html = renderSwarlipi('QsrE', 'punjabi');
    expect(html).toContain('sl-mbr');
    expect(html).not.toContain('sl-mk-l');
  });

  it('anchors an empty-interior pair to its neighbouring notes', () => {
    // `sqem` encloses no note, but it is still a glide from s to m, so it
    // wraps BOTH and draws the zone across them — no placeholder box between
    // the letters (that box used to add ~42% to the pair's width).
    const html = renderSwarlipi('sqem', 'punjabi');
    expect(html).not.toContain('sl-pc');
    expect(html).not.toContain('sl-ph');
    expect(html.startsWith('<span class="sl-meend">')).toBe(true);
    expect(html.indexOf('ਸ')).toBeLessThan(html.indexOf('ਮ'));
    expect(html.indexOf('ਮ')).toBeLessThan(html.indexOf('sl-mz'));
    expect(html).toContain('sl-mk-l');
    expect(html).toContain('sl-mk-r');
  });

  it('renders a glide the same however its markers are spelled', () => {
    // The guide teaches `q` before the note; the extractor is beat-scoped, so
    // trailing forms mean the same thing and must LOOK the same. Source
    // offsets are dropped from the comparison: they map the caret back to the
    // raw text, so they SHOULD differ when the characters sit elsewhere.
    for (const [trailing, leading] of [
      ['sqem', 'qsme'],
      ['sqre', 'qsre'],
      ['sq;em', 'qs;me'],
    ] as const) {
      expect(shape(trailing)).toBe(shape(leading));
    }
  });

  it('draws a stroked glide the same however its markers are spelled', () => {
    // `W` used to be the one marker whose spelling changed the DOM: a trailing
    // one parked its stroke on the marker and emitted the tick beside the
    // note, so the per-note rules (Bengali Ni's dot line, the lift tiers)
    // could not see it. The stroke now lands on the note either way.
    for (const [trailing, leading] of [
      ['rW', 'Wr'],
      ['nuW', 'Wnu'],
    ] as const) {
      expect(shape(trailing, 'bangla')).toBe(shape(leading, 'bangla'));
    }
  });

  it("anchors a glide to a kan, a dash, and a chhand group's last note", () => {
    // Each of these used to fall back to the blank placeholder box.
    for (const notes of [
      'q{m}s',
      '{m}sq',
      's-q',
      'q-s',
      '$srgmq',
      'geq',
      'eqg',
    ])
      expect(renderSwarlipi(notes, 'punjabi')).not.toContain('sl-ph');
  });

  it('puts a kan OUTSIDE the wrap — the glide belongs to the note', () => {
    // A kan ornaments its note, and the glide starts at the note, so the hook
    // sits on the letter. Wrapping the pair would shift it left onto the
    // ornament. A glide never starts ON a grace note.
    const html = renderSwarlipi('q{m}s', 'punjabi');
    expect(html.indexOf('sl-kan')).toBeLessThan(html.indexOf('sl-meend'));
  });

  it('lands both glides on the note a boundary beat shares', () => {
    // `eqg` / `geq`: one note ends the incoming glide and starts the outgoing
    // one, so ONE wrap carries two zones in typed order. Drawing the second
    // over a blank box left a glide stopping in the gutter beside its target.
    for (const notes of ['eqg', 'geq']) {
      const html = renderSwarlipi(notes, 'punjabi');
      expect(html.match(/sl-mz/g)).toHaveLength(2);
      expect(html.match(/sl-meend/g)).toHaveLength(1);
    }
  });

  it('renders every spelling of one glide the same', () => {
    for (const [a, b] of [
      ['sq', 'qs'],
      ['re', 'er'],
      ['sqem', 'qsme'],
      ['q{m}s', '{m}sq'],
      ['eqg', 'geq'],
    ] as const) {
      expect(shape(a)).toBe(shape(b));
    }
  });

  it('keeps a W tick that sits inside a matched pair', () => {
    // assembleMeend skips continuation markers, so a stroke parked on one used
    // to vanish; it rides the note now.
    for (const notes of ['sqWe', 'qsWe', 'qsWre'])
      expect(renderSwarlipi(notes, 'punjabi')).toContain('sl-mtick');
  });

  it('keeps the placeholder only when no note is adjacent', () => {
    // A bare pair mid-edit has nothing to anchor to, and must still draw.
    expect(renderSwarlipi('qe', 'punjabi')).toContain('sl-ph');
    expect(renderSwarlipi('w', 'punjabi')).toContain('sl-ph');
  });

  it('still arches a pair with interior notes (sqrem covers s..m)', () => {
    const html = renderSwarlipi('sqrem', 'punjabi');
    expect(html.startsWith('<span class="sl-meend">')).toBe(true);
    expect(html.indexOf('ਸ')).toBeLessThan(html.indexOf('sl-mz'));
    expect(html.indexOf('ਮ')).toBeLessThan(html.indexOf('sl-mz'));
    expect(html).toContain('sl-mk-l');
    expect(html).toContain('sl-mk-r');
  });

  it('keeps hooks visible for a marker-only span mid-edit', () => {
    const html = renderSwarlipi('qe', 'punjabi');
    expect(html).toContain('sl-mk-l');
    expect(html).toContain('sl-ph');
  });

  it('bounds a chhand arc at its slot count even around a meend', () => {
    // @ = 2 slots: the arc must cover s+r only; g stays outside.
    const html = renderSwarlipi('@sqrge', 'punjabi');
    const group = html.slice(0, html.indexOf('sl-arc'));
    expect(group).toContain('ਸ');
    expect(group).toContain('ਰੇ');
    expect(group).not.toContain('ਗ');
  });

  it('renders both arcs when two chhand groups flank a meend', () => {
    const html = renderSwarlipi('@sq@rge', 'punjabi');
    expect(html.match(/sl-arc/g)?.length).toBe(2);
  });

  it('carries the W stroke tick across a kan boundary', () => {
    expect(renderSwarlipi('sW{r}g', 'punjabi')).toContain('sl-mtick');
  });

  it('wraps a cross-beat fragment around its own note, either spelling', () => {
    // The glide starts AT the note, so the marker's side is a typing
    // convention, not geometry: the zone spans the note and adds no width.
    for (const [trailing, leading] of [
      ['sq', 'qs'],
      ['re', 'er'],
    ] as const) {
      expect(shape(trailing)).toBe(shape(leading));
    }
    for (const notes of ['sq', 'qs', 're', 'er', 'ne']) {
      const html = renderSwarlipi(notes, 'punjabi');
      expect(html).not.toContain('sl-ph');
      expect(html.startsWith('<span class="sl-meend">')).toBe(true);
      // the note rides INSIDE the wrap, before the mark zone
      expect(html.indexOf('sl-n')).toBeLessThan(html.indexOf('sl-mz'));
    }
  });

  it('keeps the right hook on a closer and the left on an opener', () => {
    expect(renderSwarlipi('sq', 'punjabi')).toContain('sl-mk-l');
    expect(renderSwarlipi('sq', 'punjabi')).not.toContain('sl-mk-r');
    expect(renderSwarlipi('ne', 'punjabi')).toContain('sl-mk-r');
    expect(renderSwarlipi('ne', 'punjabi')).not.toContain('sl-mk-l');
  });

  it('renders cross-beat fragments: start, continue, end', () => {
    expect(renderSwarlipi('qs', 'punjabi')).toContain('sl-mk-l');
    expect(renderSwarlipi('qs', 'punjabi')).not.toContain('sl-mk-r');
    expect(renderSwarlipi('wm', 'punjabi')).toContain('sl-mk-b');
    const end = renderSwarlipi('er', 'punjabi');
    expect(end).toContain('sl-mk-r');
    expect(end).not.toContain('sl-mk-l');
  });

  it('renders ghaseet cross-beat fragments as square pieces, not hooks', () => {
    const start = renderSwarlipi('Qs', 'punjabi');
    expect(start).toContain('sl-mbr sl-open-r');
    expect(start).not.toContain('sl-mk-l');
    const end = renderSwarlipi('Er', 'punjabi');
    expect(end).toContain('sl-mbr sl-open-l');
  });

  it('renders a continuation piece beside a dash (glide across a sustain)', () => {
    const html = renderSwarlipi('w-', 'punjabi');
    expect(html).toContain('sl-dash');
    expect(html).toContain('sl-mk-b');
    expect(html.indexOf('sl-meend')).toBeLessThan(html.indexOf('sl-dash'));
  });

  it('draws a bar over a placeholder for a lone w beat', () => {
    const html = renderSwarlipi('w', 'punjabi');
    expect(html).toContain('sl-ph');
    expect(html).toContain('sl-mk-b');
  });

  it('ticks the W stroke note inside a span', () => {
    expect(renderSwarlipi('qsWrem', 'punjabi')).toContain('sl-mtick');
  });

  it('combines chhand and matched meend on one beat', () => {
    const html = renderSwarlipi('$qsrem', 'punjabi');
    expect(html).toContain('sl-ch');
    expect(html).toContain('sl-meend');
  });
});

describe('renderSwarlipi — layakari (nested lower chhand)', () => {
  it('a lower arc encloses inner groups (documented layakari)', () => {
    // ~ = lower Athgun (8 slots) containing a Tigun and a Pachgun.
    const html = renderSwarlipi('~#srg%mpdnsu', 'punjabi');
    expect(html.match(/sl-arc/g)?.length).toBe(3);
    // outer group wraps both inner groups
    expect(html.indexOf('sl-ch')).toBeLessThan(html.lastIndexOf('sl-ch'));
  });

  it('lower Chhatgun over Dugun + Chaugun', () => {
    const html = renderSwarlipi('!@sr$gmpd', 'punjabi');
    expect(html.match(/sl-arc/g)?.length).toBe(3);
  });

  it('lower Chaugun over a matched meend span', () => {
    const html = renderSwarlipi('`qswrWgem', 'punjabi');
    expect(html).toContain('sl-arc');
    expect(html).toContain('sl-mk-l');
    expect(html).toContain('sl-mtick');
  });
});

describe('renderSwarlipi — bols as chhand slots', () => {
  it('counts a bol as one slot', () => {
    // @ = 2 slots satisfied by ra + daa; the trailing g stays outside.
    const html = renderSwarlipi("@'[g", 'punjabi');
    const group = html.slice(0, html.indexOf('sl-arc'));
    expect(group).toContain('ਰ');
    expect(group).toContain('ਦਾ');
    expect(group).not.toContain('ਗ');
  });

  it('counts dir as two slots', () => {
    // @ = 2 slots satisfied by dir alone; the s stays outside the group.
    const html = renderSwarlipi('@\\s', 'punjabi');
    const group = html.slice(0, html.indexOf('</span><span'));
    expect(group).toContain('ਦਿਰ');
  });

  it('renders kan inline with visible braces when asked', () => {
    const html = renderSwarlipi('{m}s', 'punjabi', { kanInline: true });
    expect(html).not.toContain('<sup');
    expect(html).toContain('sl-brace">{</span><span class="sl-n"');
    expect(html).toContain('sl-brace">}</span>');
  });

  it('stamps every rendered piece with its source range', () => {
    const html = renderSwarlipi('{m}su', 'punjabi');
    expect(html).toContain('<sup class="sl-kan" data-s="0" data-e="3">');
    expect(html).toContain('data-s="1" data-e="2"'); // the kan's ਮ
    expect(html).toContain('data-s="3" data-e="5"'); // su = one glyph, two chars
  });

  it('lets the host tag notes via noteClass (raga highlighting)', () => {
    const html = renderSwarlipi('srg', 'english', {
      noteClass: (swara) => (swara === 'r' ? 'vadi' : undefined),
    });
    expect(html).toContain('class="sl-n vadi"');
    expect(html.match(/vadi/g)).toHaveLength(1);
  });

  it('a lone W beat keeps its stroke tick on the bar piece', () => {
    expect(renderSwarlipi('W', 'punjabi')).toContain('sl-mtick');
    expect(renderSwarlipi('w', 'punjabi')).not.toContain('sl-mtick');
  });

  it('keeps bols between an empty-interior meend pair', () => {
    expect(renderSwarlipi('q;e', 'punjabi')).toContain('ਦ');
  });

  it('keeps a closer trailing the last chhand slot inside the group', () => {
    const html = renderSwarlipi('@qsre', 'english');
    expect(html).not.toContain('sl-fr');
    expect(html.indexOf('sl-meend')).toBeGreaterThan(html.indexOf('sl-ch'));
  });
});

describe('renderSwarlipi — strokes, digits, misc', () => {
  it('renders mizrab bols in the script', () => {
    const html = renderSwarlipi(";'[]", 'punjabi');
    for (const bol of ['ਦ', 'ਰ', 'ਦਾ', 'ਰਾ']) expect(html).toContain(bol);
  });

  it('renders dir with its under-arc', () => {
    const html = renderSwarlipi('\\', 'hindi');
    expect(html).toContain('दिर');
    expect(html).toContain('sl-dir');
    expect(html).toContain('sl-arc');
  });

  it('maps digits to script numerals', () => {
    expect(renderSwarlipi('123', 'punjabi')).toMatch(/੧.*੨.*੩/);
    expect(renderSwarlipi('123', 'hindi')).toMatch(/१.*२.*३/);
    expect(renderSwarlipi('123', 'english')).toMatch(/1.*2.*3/);
  });

  it('keeps murki parentheses and maps underscore to a long dash', () => {
    expect(renderSwarlipi('(r)', 'punjabi')).toContain('(');
    expect(renderSwarlipi('s_r', 'punjabi')).toContain('—');
  });

  it('returns empty string for empty input', () => {
    expect(renderSwarlipi('', 'punjabi')).toBe('');
  });

  it('falls back to English for an unknown language instead of throwing', () => {
    const html = renderSwarlipi(
      's123;',
      'gurmukhi' as unknown as Parameters<typeof renderSwarlipi>[1]
    );
    expect(html).toContain('S');
    expect(html).toMatch(/1.*2.*3/);
  });
});

describe('half-finished entries', () => {
  // A chhand symbol declares a group, so while editing it draws its full mark
  // over empty slots; in a read view a stray one is noise and is dropped.
  // (Kan braces are excluded on purpose — they keep the literal rendering the
  // malformed-kan spec above pins down.)
  const bare = ['@', '#', '$', '%', '^', '&', '*', '`', '!', '~'];

  it.each(bare)('renders nothing for a bare %s in a read view', (ch) => {
    expect(renderSwarlipi(ch, 'punjabi')).toBe('');
  });

  it.each(bare)('renders a visible mark for a bare %s while editing', (ch) => {
    const html = renderSwarlipi(ch, 'punjabi', { editing: true });
    expect(html).not.toBe('');
    // Never the raw character — a dot or an arc, drawn over an empty slot.
    expect(html).not.toMatch(/>[uUlL@#$%^&*`!~]</);
  });

  // An octave dot is positioned against the letter it sits on, so a bare
  // modifier has nothing to draw — in either mode — and must not leak as
  // raw ASCII the way it used to.
  it.each(['u', 'U', 'l', 'L'])('renders nothing for a bare %s', (ch) => {
    expect(renderSwarlipi(ch, 'punjabi')).toBe('');
    expect(renderSwarlipi(ch, 'punjabi', { editing: true })).toBe('');
    expect(toUnicodeNotation(ch, 'punjabi')).toBe('');
  });

  it('draws a bare chhand at its full declared width while editing', () => {
    // The arc stretches to its container and encodes the count in height
    // alone, so one slot would make `@`/`#`/`$` indistinguishable.
    for (const [ch, slots] of [
      ['@', 2],
      ['#', 3],
      ['$', 4],
      ['*', 8],
      ['~', 8],
    ] as const) {
      const html = renderSwarlipi(ch, 'punjabi', { editing: true });
      expect(html).toContain('sl-ch');
      expect(html.match(/sl-ph/g)).toHaveLength(slots);
    }
  });

  it("gives an unclosed brace the same box as a closed kan's braces", () => {
    // `.sl-brace`'s width is the metrics fonts' brace advance, so the caret
    // tracks the glyph while the kan is still open — and the brace does not
    // change size the instant `}` is typed.
    for (const notes of ['{', '}', '{m', '{}']) {
      const html = renderSwarlipi(notes, 'punjabi');
      expect(html).toContain('sl-brace');
      expect(html).not.toContain('sl-kan');
    }
  });

  it('leaves real notation characters alone in both modes', () => {
    for (const ch of [',', '(', ')', '-', '_', '3']) {
      expect(renderSwarlipi(ch, 'punjabi')).not.toBe('');
      expect(renderSwarlipi(ch, 'punjabi', { editing: true })).not.toBe('');
    }
  });

  it('renders complete entries identically in both modes', () => {
    for (const notes of ['su', 'sL', '{m}p', '@sr', 'qsre', 's-r']) {
      expect(renderSwarlipi(notes, 'punjabi', { editing: true })).toBe(
        renderSwarlipi(notes, 'punjabi')
      );
    }
  });

  it('drops storage-only characters from copy-as-text', () => {
    expect(toUnicodeNotation('u', 'punjabi')).toBe('');
    expect(toUnicodeNotation('su', 'punjabi')).not.toBe('');
  });
});

// MEEND_BAR_RATIO is the single source for the glide's stroke weight, but two
// consumers can't import it: the stylesheet, and the app's print anchor rule.
// They mirror the number instead, so pin the mirrors here.
describe('MEEND_BAR_RATIO', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf-8');

  const html = renderSwarlipi('qwe', 'punjabi');
  // The bar band, read back off the path the renderer actually emitted.
  const band =
    /<path d="M1\.1 0\.0H98\.9L100\.0 [\d.]+V[\d.]+L98\.9 ([\d.]+)/.exec(
      html
    )?.[1];
  const frame = /viewBox="0 0 100 ([\d.]+)"/.exec(html)?.[1];

  it('matches the W bar band the renderer actually draws', () => {
    expect(band).toBeDefined();
    expect(frame).toBeDefined();
    expect(Number(band) / Number(frame)).toBeCloseTo(MEEND_BAR_RATIO, 10);
  });

  it('matches the hook outlines the bar joins', () => {
    // Both curls leave the bar at the band's lower edge. Move the band without
    // re-cutting these hand-drawn outlines and the stroke changes weight
    // mid-span, which is the defect the single-sourced weight exists to kill.
    // Pinned AT the join's position in each path: a bare substring check
    // passes on unrelated control points (` 5` matches `40.69 5.6`), so it
    // would wave through exactly the drift it is here to catch.
    const q = /<path d="(M100\.0 [^"]+)"/.exec(html)?.[1];
    const e = /<path d="(M2\.07 [^"]+)"/.exec(html)?.[1];
    expect(q).toBeDefined();
    expect(e).toBeDefined();
    expect(q).toContain(`L99.31 ${band}Q`);
    expect(e).toContain(`0.69 ${band}L`);
  });

  it('keeps the zone height single-sourced, since --sl-bar multiplies it', () => {
    // --sl-bar = --sl-mz-h * --sl-bar-ratio, and the fragment band is a
    // fraction of the zone's RENDERED height — they agree only while .sl-mz
    // takes its height from the same variable.
    expect(css).toMatch(/--sl-mz-h:\s*[\d.]+em/);
    expect(css).toMatch(/\.sl-wrap \.sl-mz \{[^}]*height:\s*var\(--sl-mz-h\)/);
  });

  it('matches the stylesheet --sl-bar-ratio the ghaseet border derives from', () => {
    const declared = /--sl-bar-ratio:\s*([\d.]+)\s*;/.exec(css);
    expect(declared).not.toBeNull();
    expect(Number(declared![1])).toBeCloseTo(MEEND_BAR_RATIO, 10);
  });
});
