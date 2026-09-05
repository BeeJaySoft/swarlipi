# Integration

Swarlipi renders one beat. Everything that spans beats, or depends on where a
beat lands on the page, is the host's work. This page is the contract.

## The stylesheet's hooks

| Hook                | Meaning                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.sl-wrap`          | Wrapper. `font-size: calc(1em * var(--sl-scale))`, `line-height: 1.9`.                                                     |
| `--sl-scale`        | Optical bump over surrounding text (default `1.08`). Multiply it back in if you override the wrapper's font-size.          |
| `.sl-bold`          | Bold weight (700). Normal weight is 500.                                                                                   |
| `--font-sl`         | Letter face per script. Defaults to the Noto Sans script faces; the CSS does not fetch fonts.                              |
| `.sl-n`             | A note. `noteClass` (below) adds to it.                                                                                    |
| `.sl-mz`, `.sl-mbr` | Meend and ghaseet mark zones. A cross-beat span is bridged by the host between consecutive zones.                          |
| `[data-sl-bar]`     | Attribute for the host's bridging bars; anchor-positioning rules for print live in the host.                               |
| `--sl-mz-h`         | Mark-zone height (`0.34em`). `--sl-bar` multiplies it, so `.sl-mz` must keep taking its height from this variable.         |
| `--sl-bar-ratio`    | Fraction of the zone its bar fills. Mirrors `MEEND_BAR_RATIO`; a test fails if the two drift. Use it, do not re-derive it. |
| `--sl-bar`          | Resulting stroke weight, and the ghaseet bracket's border width.                                                           |
| `--sl-mbr-leg`      | Ghaseet bracket leg length below the bar.                                                                                  |

**Derived, do not set:** `--sl-mbr-top` follows the script's dot line minus
the W tick's reach. Every meend sits at one height per script, ticked or not,
with the tick hanging inside the band above the taar dot line. That is the
rule the Omenad faces use, where every marker glyph shares one vertical band.
Override the dot line if you must, and let the bar follow.

## Per-note styling

`noteClass` is called for every note with its swara letter and octave marker,
and whatever it returns is added to that note's `.sl-n`. Marks inherit the
note's colour through `currentColor`, so colouring a note colours its dots and
lines too. The notation app uses it to highlight a raga's vadi and samvadi.

```ts
renderSwarlipi(notes, 'hindi', {
  noteClass: (swara) => (swara === 'p' ? 'text-primary' : undefined),
});
```

## Source ranges, for a caret

Every rendered piece carries `data-s` and `data-e`: the character range of the
input it came from. The ranges nest. A kan's `<sup>` carries its whole `{…}`
range while the notes inside carry theirs, so a caret mapper must filter to
**leaves**, pieces with a range and no descendant that has one. Chhand group
wrappers and placeholder slots carry no range at all.

With that, an editor can keep a plain ASCII `<input>` invisible under the
rendered run and draw its own caret at the rendered boundary that matches the
input's selection. Multi-character glyphs (`su` is one letter with a dot) map
the caret to their end.

<SwaraRow notes="{m}s ru" />

## Fitting a beat to its column

A beat can be wider than the column it sits in. Because the ratios of a run's
natural width to its font-size are fixed once the fonts are loaded, the host
can measure them once and let CSS resolve the size from the column width with
container-query units, so the same rule serves screen and print. Keep
`.sl-wrap` on an inner element so the outer line holds the baseline for a
shrunk run. The notation app condenses along the Noto width axis before it
shrinks, and makes the beats a cross-beat glide joins agree on one size, as a
ratio, so the agreement survives print laying the cells out narrower.

## Cross-beat glides

The renderer draws per-beat fragments: a hook where a glide leaves a note, a
bar where it passes through a beat, a hook where it arrives. Each fragment
wraps the note it belongs to, so a marker costs no inline width and `qs` draws
the same picture as `sq`. Joining the fragments across beats is layout work
the host does, because only the host knows where the cells land.

Bridge thickness must come from `MEEND_BAR_RATIO`, not from a measurement:

```ts
import { MEEND_BAR_RATIO } from 'swarlipi';

// ink height as a fraction of the zone's box — scale-free, so it stays right
// when print re-lays-out at a size no screen measurement can predict
const slabRatio = MEEND_BAR_RATIO;
```

Size the bridge's box to the whole zone and draw the band inside it at that
ratio. Sizing the box to the band instead lets the browser round it
differently from the fragment bars, and the fragments come out visibly thicker
at the junctions. See [Cross-beat glides](/notation/cross-beat) for the
fragments themselves.

## Print

Every mark is ink, not background: SVG fills and borders. Nothing depends on
"print background graphics". Dots, ticks and bars are small inline SVGs with
`overflow: visible`, because a circle touching its viewport edge rasterises
with a flat side in PDF output.
