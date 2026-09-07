# Swarlipi

Fontless Bhatkhande (Hindustani) notation renderer. Turns the compact ASCII
notation grammar (`s r g m`, `R G M D N` for komal/tivra, `u`/`l` octave
markers, `{kan}`, chhand `@#$%^&*`, meend `q w W e`, ghaseet `Q E`, bols
`; ' [ ] \`) into real Unicode text in Gurmukhi, Devanagari, Bengali or Latin,
with every notation mark drawn by CSS and inline SVG instead of a custom font.

- Framework-agnostic: returns an HTML string. SSR-safe, no DOM access.
- Zero runtime dependencies.
- Sizing is pure `em`, colours use `currentColor`, marks are border/SVG ink so
  they print without "background graphics".
- A **Swarlipi font** (see Fonts, parked) will cover the one thing CSS can't:
  making copied plain text render its marks in any app.

## Compatible with the Omenad keymap

The input grammar is the character mapping of the **Omenad Bhatkhande fonts**
(OmeBhatkhande Punjabi, Hindi, Bangla and English): the same letters for the
swaras, capitals for komal and tivra, `u l U L` for the octaves, `{ }` for kan,
`@#$%^&*` for chhand, `q w W e` / `Q E` for meend and ghaseet, `; ' [ ] \` for
the bols. Notation typed for those fonts renders in Swarlipi unchanged —
nothing to convert — and the four scripts correspond to the four faces. What
changes is the output: real text instead of glyph substitution.

## Usage

```ts
import { renderSwarlipi, swarlipiWrapperClass } from 'swarlipi';
import 'swarlipi/style.css';

const html = renderSwarlipi('@sr{g}m', 'punjabi');
// <span class="sl-ch"><span class="sl-n">ਸ</span>…</span>

element.className = swarlipiWrapperClass('punjabi'); // "sl-wrap sl-punjabi"
element.innerHTML = html;
```

The wrapper element must carry `swarlipiWrapperClass(script)`; the stylesheet
keys every mark position off the `.sl-<script>` class. Scripts: `punjabi`,
`hindi`, `bangla`, `english`.

### Contract (things an integrator may touch)

| Hook                | Meaning                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `.sl-wrap`          | Wrapper. `font-size: calc(1em * var(--sl-scale))`, `line-height: 1.9`.                                                      |
| `--sl-scale`        | Optical bump vs. surrounding text (default `1.08`). Multiply it back in if you override the wrapper's font-size.            |
| `.sl-bold`          | Bold weight (700). Normal weight is 500.                                                                                    |
| `--font-sl`         | Letter face per script (defaults to the Noto Sans script faces; the CSS does **not** fetch fonts — load them yourself).     |
| `.sl-mz`, `.sl-mbr` | Meend / ghaseet mark zones. A cross-beat span is bridged between consecutive zones by `swarlipi/bridge`.                    |
| `[data-sl-bar]`     | A bridging bar. Positioned by the stylesheet: absolute, and anchor-pinned to its zones where the engine supports anchors.   |
| `--sl-mz-h`         | Mark-zone height (`0.34em`). `--sl-bar` multiplies it, so `.sl-mz` must keep taking its height from this variable.          |
| `--sl-bar-ratio`    | Fraction of the zone its bar fills. Mirrors `MEEND_BAR_RATIO` — a test fails if the two drift. Use it, do not re-derive it. |
| `--sl-bar`          | Resulting stroke weight, and the ghaseet bracket's border width.                                                            |
| `--sl-mbr-leg`      | Ghaseet bracket leg length below the bar. Its box is `leg + bar`, so a heavier bar thickens ink without shortening legs.    |

**Derived, do not set:** `--sl-mbr-top` is computed from that script's
`--sl-dot-a-top` minus the W tick's reach (`--sl-tick-reach`, itself the sum of
`--sl-tick-top`, `--sl-tick-gap` and `--sl-tick-h`) and a pixel of clearance.
Every meend therefore sits at ONE height per script, ticked or not, with the
tick hanging inside the band above the taar dot line — the rule the Omenad
faces use, where every marker glyph shares one vertical band whose bottom is
exactly the dot's top. Override the dot line if you must; let the bar follow.

### Plain text

```ts
import { toUnicodeNotation } from 'swarlipi';
toUnicodeNotation('Rl', 'hindi'); // "रे̱̣"  (letter + combining marks)
```

Marks are Unicode combining characters placed **after** the whole letter
cluster (never between a consonant and its vowel sign, which splits the
syllable in CoreText/Word). Whether they show depends on the destination
font — install a Swarlipi font for guaranteed rendering.

## Fonts (built, not shipped)

The plain-text export only shows its marks where the destination font can
shape them. The fix is a **Swarlipi font** per script: Noto Sans `<Script>`
plus the six combining marks with GPOS anchors, one variable font per script
(weight 400–700), renamed because "Noto" is an OFL Reserved Font Name. A font
cannot stretch chhand arcs or meend bars across letters, so the renderer keeps
that role; the font is for "everything else": Word, Pages, PDFs, anywhere the
copied text lands and the font is installed.

`scripts/build-fonts.py` builds them from pinned Noto releases (Python 3.10+
with `fontTools`; `pnpm --filter swarlipi build:fonts` → `fonts/`, git-ignored,
as is the `.noto-cache/` of Noto zips). Binaries never enter git: the package's
`prepack` script runs the build, so `pnpm pack` and `npm publish` ship `fonts/`
inside the tarball, and every published version carries fonts built from its
own calibration. Noto stays pinned on purpose; bumping a pin is a deliberate
commit, since new outlines can move under the anchors.

Shipping is parked until the package publishes or copy-as-text goes beyond
admins. Known state when parked: verified in HarfBuzz, CoreText and Chromium;
the Chromium check of the `calt` komal-underline variants was not re-run after
the mark-bearing fix; anchor x is static (ink centre at Regular), so a bold
dot can sit a few units off-centre; Windows Word and LibreOffice untested.

## Cross-beat meend

The renderer draws per-beat fragments (hook / bar / hook), each wrapping the
note its glide leaves from or arrives at, so a marker costs no inline width and
`qs` draws the same picture as `sq`. Joining the fragments across beats is
layout work, and `swarlipi/bridge` does the measuring: given the container,
the beat cells and which beats pair, it returns one bar per gap between
consecutive fragments along a span (row wraps included).

```ts
import { measureBridges, bridgeElement } from 'swarlipi/bridge';

function drawBridges() {
  // Bars from the last measure hold stale geometry: replace, never append to.
  for (const old of container.querySelectorAll('[data-sl-bar]')) old.remove();
  const bars = measureBridges({
    container, // position: relative; the cells are its descendants
    cellAt: (i) => cells[i], // beat cell per flat beat index
    spans: [{ from: 2, to: 5 }], // which beats pair — the host's rule
    anchorPrefix: '--bridge-0', // unique per container on the page
  });
  for (const bar of bars) container.append(bridgeElement(bar));
}
```

`bridgeStyle` / `bridgeClass` / `bridgeMarkup` are the same thing split up for
a template layer (put `data-sl-bar` on the element). Each bar carries two
geometries: a measured `calc(% + px)` fallback, and inline `anchor-name`s on
the zones it joins, which the stylesheet's `[data-sl-bar]` rules pin the bar
to where CSS anchor positioning is supported. The anchored geometry re-derives
itself on every layout pass, so it survives print, where the page re-lays-out
at a size no screen measurement can predict.

Call it again when the cells move (resize, font load, font-size change) and
when a beat re-renders: the anchor names are inline styles on rendered output, so a
re-render drops them. Which beats pair is not the package's call; the notation
app's rules live in `@np/notation/meend` (adjacent beats pair on `q`/`e`
alone, longer glides need a `w`/`W` in every beat between).

## Acknowledgements

Swarlipi is inspired by the [Omenad](https://github.com/omenad/fonts)
Bhatkhande fonts. It keeps their character mapping, so notation typed for those
fonts renders unchanged, and its chhand arc and meend hook shapes are traced
from the OmeBhatkhande typefaces, which are released under the SIL Open Font
License. Everything else, the letters, the marks and the layout, is Unicode
text and CSS.
