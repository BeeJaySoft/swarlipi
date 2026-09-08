/**
 * Reference samples: every form the renderer draws, grouped the way the docs
 * and the app's dev sheet present them. One source, so the two never drift.
 */
import type { BridgeSpan } from './bridge';

export interface SampleGroup {
  title: string;
  /** Shown under the title — what the group demonstrates or a caveat. */
  note?: string;
  /** One beat's notation per entry. */
  samples: string[];
}

export interface CrossBeatSample {
  title: string;
  note?: string;
  /** Consecutive beats, one notation string each. */
  beats: string[];
  /**
   * Which beats a host pairs into one glide, as `swarlipi/bridge` spans. The
   * pairing rule belongs to the host, not the renderer (the notation app's is
   * `extractMeendSpans` in `@np/notation/meend`), so a sample carries the
   * answer for its own beats. Every sample below sets it, `[]` included — an
   * empty list is the "does not pair" case, and an absent one means a consumer
   * built the sample itself and should treat it as unbridged.
   */
  spans?: BridgeSpan[];
}

/** Single-beat samples: one beat's notation per entry. */
export const SAMPLE_GROUPS: SampleGroup[] = [
  { title: 'Letters', samples: ['s r g m p d n'] },
  { title: 'Komal + tivra', samples: ['R G M D N', 'sRgGmM', 'nNdD'] },
  {
    title: 'Octaves',
    samples: ['sl su sU sL', 'nl pu Mu dL', 'ru rl nu gu', 'nlsss', 'sndlpl'],
  },
  {
    title: 'Crowded (spacing showcase)',
    samples: ['sssr', 'nnns', 'srgM', 'mpdns', 'ssssssss'],
  },
  { title: 'Kan', samples: ['{m}s', 'p{m}s', '{pd}n', '{r}s{n}d', '{nu}s'] },
  {
    title: 'Chhand',
    samples: [
      '@sr',
      '#srg',
      '$srgm',
      '$srgM',
      '%srgmp',
      '^srgmpd',
      '*srgmpdns',
      '$nlsss',
      '$sMRuRL',
      '{pd}@nn',
      '@sr@gm',
    ],
  },
  { title: 'Dashes', samples: ['s-', 's---', '@s-', '$sr--'] },
  {
    title: 'Meend + ghaseet',
    note: 'In-beat pairs span themselves. A cross-beat span renders as per-beat fragments that the host bridges (see Cross-beat glides), so a single beat here shows only its fragment end.',
    samples: [
      'qse',
      'qsre',
      'sqem',
      'sq',
      'ne',
      'qswrwgem',
      'qsWrem',
      'qsWruem',
      'QsrE',
      '$qsrem',
      'qsuem',
    ],
  },
  {
    title: 'Strokes + murki + digits',
    samples: [";'[]", "s;r'", 's\\r', '(r)', 's(r)g', '123', 's_r'],
  },
  {
    title: 'Half-finished entries',
    note: 'A marker with nothing to attach to yet. A read view omits it; with `editing` the renderer draws it over an empty slot so a half-typed beat stays visible. An octave modifier alone draws nothing in either mode — its dot only means something on a note.',
    samples: [
      '@',
      '#',
      '$',
      '~',
      'u',
      'l',
      'U',
      'L',
      '{',
      '}',
      '{m',
      'q',
      'w',
      'e',
    ],
  },
  {
    title: 'Real beats',
    samples: ['$mpdp', '@gm', '@nlr', 'su', '$srgM nu', 'Rs NlDl'],
  },
  {
    title: 'Kitchen sink (everything in one beat)',
    note: 'Chhand over five slots with a two-note kan, a meend that opens here with a struck continuation stacked on a taar-komal Re and closes onto ati-mandra Ma, then tivra Ma with a mandra dot and a dash; a two-slot chhand over taar-komal Ga, a murki, komal Ni, a bol, a digit and a line; a ghaseet with a stroke tick.',
    samples: ['%{pd}sqWRuemLMl-', '@Gu(r)N;2_', 'QsWrE'],
  },
];

/**
 * Cross-beat spans. Each entry is a run of consecutive beats; the renderer
 * draws every beat's fragment, and the host bridges the fragments across the
 * cells (see Cross-beat glides). Which beats pair is the host's rule too —
 * these samples follow the notation app's: adjacent beats pair on q/e alone,
 * a longer glide needs a dangling w/W on every beat between.
 */
export const CROSS_BEAT_SAMPLES: CrossBeatSample[] = [
  {
    title: 'w — plain continuation',
    beats: ['qs', 'w', 'er'],
    spans: [{ from: 0, to: 2 }],
  },
  {
    title: 'W — stroke on a lone continuation beat',
    beats: ['qs', 'W', 'er'],
    spans: [{ from: 0, to: 2 }],
  },
  {
    title: 'W on a note, with a taar dot',
    note: 'The tick must clear the dot.',
    beats: ['qs', 'Wru', 'er'],
    spans: [{ from: 0, to: 2 }],
  },
  {
    title: 'W on Ni with a taar dot',
    note: "Bengali's Ni takes a dot line higher than every other letter. The bar does not move for a tick, so the ticked-Ni rule drops that dot back to the normal line to keep the dash off it.",
    beats: ['qs', 'Wnu', 'er'],
    spans: [{ from: 0, to: 2 }],
  },
  {
    title: 'Two continuations',
    beats: ['qs', 'w', 'w', 'er'],
    spans: [{ from: 0, to: 3 }],
  },
  {
    title: 'W then w',
    beats: ['qs', 'Wr', 'w', 'er'],
    spans: [{ from: 0, to: 3 }],
  },
  {
    title: 'Adjacent beats — no w needed',
    beats: ['sq', 'er'],
    spans: [{ from: 0, to: 1 }],
  },
  {
    title: 'Unmarked gap — does not pair, so no bridge',
    beats: ['sq', 'm', 'er'],
    spans: [],
  },
  {
    title: 'Ghaseet across beats',
    beats: ['Qs', 'w', 'Er'],
    spans: [{ from: 0, to: 2 }],
  },
  {
    title: 'Two spans sharing a boundary beat — only the first is ticked',
    note: 'The middle beat closes the first span and opens the second. The two bars must read as two unbroken lines: a step, if any, only between the spans, never inside one.',
    beats: ['qs', 'Wru', 'geq', 'w', 'pe'],
    spans: [
      { from: 0, to: 2 },
      { from: 2, to: 4 },
    ],
  },
];
