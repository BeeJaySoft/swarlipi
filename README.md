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

| Hook                | Meaning                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `.sl-wrap`          | Wrapper. `font-size: calc(1em * var(--sl-scale))`, `line-height: 1.9`.                                                        |
| `--sl-scale`        | Optical bump vs. surrounding text (default `1.08`). Multiply it back in if you override the wrapper's font-size.              |
| `.sl-bold`          | Bold weight (700). Normal weight is 500.                                                                                      |
| `--font-sl`         | Letter face per script (defaults to the Noto Sans script faces; the CSS does **not** fetch fonts — load them yourself).       |
| `.sl-mz`, `.sl-mbr` | Meend / ghaseet mark zones. Cross-beat spans are the host's job: bridge consecutive zones with a bar (see the app's overlay). |
| `[data-sl-bar]`     | Attribute the host puts on its bridging bars; the CSS anchor-positioning rules for print live in the host.                    |
| `--sl-mz-h`         | Mark-zone height (`0.34em`). `--sl-bar` multiplies it, so `.sl-mz` must keep taking its height from this variable.            |
| `--sl-bar-ratio`    | Fraction of the zone its bar fills. Mirrors `MEEND_BAR_RATIO` — a test fails if the two drift. Use it, do not re-derive it.   |
| `--sl-bar`          | Resulting stroke weight, and the ghaseet bracket's border width.                                                              |
| `--sl-mbr-leg`      | Ghaseet bracket leg length below the bar. Its box is `leg + bar`, so a heavier bar thickens ink without shortening legs.      |

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

## Fonts (parked)

The plain-text export only shows its marks where the destination font can
shape them. The fix is a **Swarlipi font** per script — Noto Sans + the six
combining marks with GPOS anchors (variable, weight 400–700). A working
fontTools build and a GitHub Actions workflow are preserved on
mbaljeetsingh/np-mono#419 (not in the repo yet); fonts will ship as release
assets / in the npm tarball, never as committed binaries.

## Cross-beat meend

The renderer draws per-beat fragments (hook / bar / hook), each wrapping the
note its glide leaves from or arrives at, so a marker costs no inline width and
`qs` draws the same picture as `sq`. Joining the fragments across beats is
layout work the host must do, because only the host knows where beat cells
land. The reference implementation is `NotationMeendOverlay.vue` in the
Kirtan/Sangeet Notation app.

Bridge thickness must come from `MEEND_BAR_RATIO`, not a measurement:

```ts
import { MEEND_BAR_RATIO } from 'swarlipi';
// ink height as a fraction of the zone's box — scale-free, so it stays right
// when print re-lays-out at a font size no screen measurement can predict
const slabRatio = MEEND_BAR_RATIO; // .sl-mz; a ghaseet's is --sl-bar / its box
```

Size the bridge's box to the WHOLE zone and draw the band inside it at that
ratio. Sizing the box to the band instead lets the browser round it differently
from the fragment bars, and the fragments come out visibly thicker at the
junctions.
