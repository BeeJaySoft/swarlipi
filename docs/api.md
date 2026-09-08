# API

```ts
import {
  renderSwarlipi,
  swarlipiWrapperClass,
  toUnicodeNotation,
  escapeHtml,
  MEEND_BAR_RATIO,
  type SwarlipiScript,
  type SwarlipiRenderOptions,
} from 'swarlipi';
import 'swarlipi/style.css';
import { measureBridges, bridgeElement } from 'swarlipi/bridge';
import { SAMPLE_GROUPS, CROSS_BEAT_SAMPLES } from 'swarlipi/samples';
import { SYMBOL_GROUPS } from 'swarlipi/reference';
```

## `renderSwarlipi(notes, script, options?)`

Renders one beat's notation as an HTML string. Never touches the DOM.

- `notes: string`: the beat, in the [Omenad keymap](/notation/compatibility).
- `script: SwarlipiScript`: `'punjabi' | 'hindi' | 'bangla' | 'english'`. An
  unknown value degrades to `'english'` rather than throwing, since the value
  often comes from a cookie.
- `options.noteClass?: (swara: string, octave?: string) => string | undefined`:
  extra class(es) for a note's `.sl-n`.
- `options.editing?: boolean`: draw half-typed markers over empty slots.

Returns `''` for an empty string.

## `swarlipiWrapperClass(script)`

The class list the receiving element must carry: `"sl-wrap sl-<script>"`.

## `toUnicodeNotation(notes, script)`

The plain-text form: letters in the script plus Unicode combining marks.
Marks are placed after the whole letter cluster, never between a consonant and
its vowel sign, which would split the syllable in CoreText and Word.

```ts
toUnicodeNotation('Rl', 'hindi'); // "रे̱̣"  komal Re, mandra
```

### What survives

| Input                  | Becomes                                      |
| ---------------------- | -------------------------------------------- |
| letters                | the script's letters, with their vowel signs |
| komal `R G D N`        | U+0331 combining macron below                |
| tivra `M`              | U+030D combining vertical line above         |
| octaves `u U l L`      | U+0307, U+0308, U+0323, U+0324               |
| kan `{p}`, murki `(r)` | parentheses around the notes                 |
| bols `; ' [ ] \`       | their letters (`;` → ਦ / द / দ)              |
| digits `1 2 3`         | the script's digits                          |
| `-` and `_`            | en dash and em dash                          |

### What is lost

This is a **one-way export for reading, not a storage format.** Notation
cannot be recovered from the text it produces.

- **Chhand markers are dropped.** `@sr` and `sr` give the same text, so the
  subdivision is gone.
- **Meend and ghaseet markers are dropped.** `qsre`, `QsrE` and `sre` all give
  the same text. Nothing in Unicode draws a glide across letters.
- **A continuation-only beat becomes an empty string.** `w` and `W` carry no
  letter, so a beat holding just a continuation exports as nothing. Join beats
  with a separator of your own if an empty beat would be ambiguous.
- **Kan and murki are indistinguishable**, since both become parentheses.
- **Whether the marks are drawn depends on the destination font.** The
  [Swarlipi fonts](/fonts/) exist for exactly this; in a font without the
  marks the letters still read and the marks are dropped or misplaced.

## `MEEND_BAR_RATIO`

The thickness of a meend or ghaseet line as a fraction of its mark zone's
height. `swarlipi/bridge` draws its bars from it; `--sl-bar-ratio` in the
stylesheet mirrors it.

## `swarlipi/bridge`

Joins the per-beat glide fragments across beats. Browser only: it measures
the DOM.

### `measureBridges({ container, cellAt, spans, anchorPrefix })`

Returns a `BridgeBar[]`, one per gap between consecutive fragments along each
span, two where a span wraps to the next row.

- `container: HTMLElement`: the positioned element the bars are placed in.
  The beat cells must be its descendants.
- `cellAt: (beatIndex) => Element | null | undefined`: the beat cell for a
  flat beat index.
- `spans: { from: number; to: number }[]`: which beats pair. Spans with
  `to <= from` are skipped; an in-beat pair draws itself.
- `anchorPrefix: string`: a dashed-ident (`--x`) unique per container on the
  page. Each fragment along a span gets an inline `anchor-name` under it.

Every bar carries a measured fallback (`calc(% + px)` left and width, px top
and height) and the anchor names of the zones it joins. The stylesheet's
`[data-sl-bar]` rules pin it to those zones where the engine supports CSS
anchor positioning, and the browser re-derives the geometry on every layout
pass. That is what makes the bridges print: the print engine re-lays-out at
paper width with print-media font sizes, which no screen measurement can
predict. `slabRatio` is the band's height as a fraction of the box, scale-free
for the same reason.

### `planBridges({ containerRect, zonesAt, spans })`

The geometry with no DOM: rectangles in, `BridgeBar[]` out.
`measureBridges` is a thin shim over it that reads the page and writes the
anchor names. Use it directly if you already hold the layout — a virtualised
grid, a worker, a test.

`zonesAt(beatIndex)` returns that beat's fragments in document order, each as
`{ name, rect, cellRect, slabRatio }`: the anchor name you assigned, the
fragment's own box, its beat cell's box (x is decomposed against the centre)
and the ink fraction. Return `undefined` (or `[]`) for a beat that is not
rendered — a span running past the rendered window still bridges the fragments
that are present, which is what a trimmed view needs.

It returns no bars when `containerRect.width` is 0, since an unlaid-out
container reports every rectangle as 0 and there is nothing to measure against;
call it again once the container has a size.

### `bridgeElement(bar, doc?)`

A ready `<div data-sl-bar>` with the bar's style and ink. Append it to the
container, after removing the bars from the previous measure: their geometry
is stale, and the anchor names they reference may be gone.

### `bridgeStyle(bar)`, `bridgeClass(bar)`, `bridgeMarkup(bar)`

The pieces of `bridgeElement` for a template layer: the inline style object
(the measured fallback plus the `--sl-t` / `--sl-a` / `--sl-b` anchor names),
the `sl-bar-a` / `sl-bar-b` classes that say which ends are zone-pinned, and
the inner svg that draws the band. Put `data-sl-bar` on the element yourself.

### `BRIDGE_ZONE_SELECTOR`, `BRIDGE_OVERLAP`

The fragment selector (`.sl-mz, .sl-mbr`), useful for deciding whether a DOM
mutation needs a re-measure, and the fraction of a zone's height each bar
runs into its zones so the junctions print seamless. A test keeps the
stylesheet's anchor rules on the same value.

## `escapeHtml(value)`

The escaper the renderer uses for text it passes through. Exported for hosts
that build markup around the output.

## `swarlipi/style.css`

The stylesheet the markup needs. Prefixed `sl-`; see the
[hooks table](/guide/integration#the-stylesheet-s-hooks).

## `swarlipi/samples`

`SAMPLE_GROUPS`: single-beat samples grouped by feature, each `{ title, note?,
samples }`. `CROSS_BEAT_SAMPLES`: runs of consecutive beats,
`{ title, note?, beats }`. The source of the [Symbols](/notation/).

## `swarlipi/reference`

`SYMBOL_GROUPS`: the symbol mapping as data, grouped `{ id, title, entries }`
with each entry `{ key, name, example }`. The source of the
[keymap table](/notation/keymap) and of the notation app's
in-editor guide sheet.
