# Getting started

## Install

```sh
npm i swarlipi
```

## Render a beat

Swarlipi is a pure function: notation in, an HTML string out. It never touches
the DOM, so it runs the same on the server and in the browser.

```ts
import { renderSwarlipi, swarlipiWrapperClass } from 'swarlipi';
import 'swarlipi/style.css';

const html = renderSwarlipi('{g}#srm', 'punjabi');
// <sup class="sl-kan"><span class="sl-n">ਗ</span></sup><span class="sl-ch">…</span>

element.className = swarlipiWrapperClass('punjabi'); // "sl-wrap sl-punjabi"
element.innerHTML = html;
```

<SwaraRow notes="{g}#srm" />

The element that receives the HTML must carry `swarlipiWrapperClass(script)`.
The stylesheet keys every mark position off the `.sl-<script>` class, and
`.sl-wrap` carries the run's own font-size and line-height, so put it on an
**inner** element and size the element around it.

| Script      | Letters                    |
| ----------- | -------------------------- |
| `'punjabi'` | Gurmukhi ਸ ਰੇ ਗ ਮ ਪ ਧ ਨੀ   |
| `'hindi'`   | Devanagari स रे ग म प ध नी |
| `'bangla'`  | Bengali স রে গ ম প ধ নী    |
| `'english'` | Latin S R G M P D N        |

## Load the fonts

Swarlipi draws its letters with whatever `--font-sl` resolves to. The defaults
are the Noto Sans script faces, and the stylesheet does **not** fetch them.
The simplest way is the Google Fonts stylesheet this site uses:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400..700&family=Noto+Sans+Devanagari:wght@400..700&family=Noto+Sans+Bengali:wght@400..700&family=Noto+Sans:wght@400..700&display=swap"
/>
```

Self-hosting, or another face, is one variable per script:

```css
.sl-punjabi {
  --font-sl: 'My Gurmukhi', sans-serif;
}
```

The mark geometry was calibrated against the Noto faces. Another face will
place its letters differently, so check the dot lines and the tivra bar
against it before shipping.

### Other faces

Any face works, but the marks are placed against the em box while the letters
are placed against the baseline, so a face whose baseline sits elsewhere needs
two variables re-derived per script: `--sl-baseline`, which you can measure
with a zero-height inline-block probe inside the run, and `--sl-dot-a-top`,
which is `baseline − tallest ink − 0.075 − 0.15` (the dot clears the tallest
letter by 0.075em and is 0.15em tall). The tivra bar and the mandra line follow
from the dot line on their own.

**Baloo** as a worked example — rounded, and one of the two families that cover
all three Indic scripts with a weight axis:

```css
.sl-punjabi {
  --font-sl: 'Baloo Paaji 2', sans-serif;
  --sl-baseline: 0.775em;
  --sl-dot-a-top: -0.299em;
}
```

Its siblings take `0.76em` / `-0.338em` (Baloo 2, Devanagari) and `0.75em` /
`-0.394em` plus `--sl-matp-dot: 66.4%` (Baloo Da 2, Bengali — `রে` puts its
vowel sign before the consonant, and the octave dot centres on the consonant).
**Noto Serif** is the other complete set: `--sl-baseline: 0.845em` throughout,
with `--sl-dot-a-top` of `-0.298em`, `-0.275em` and `-0.298em`, and
`--sl-mat-dot: 36.2%` / `--sl-matp-dot: 71%` for Bengali.

Check the dot lines and the tivra bar on your own pages before shipping either.
And not every suggestion covers the scripts at all: Inter, Plus Jakarta Sans and
JetBrains Mono carry no Indic, while Mukta, Modak and Rozha One are
Devanagari-only with static weights, so `.sl-bold` would be synthesised.

## Size and weight

`.sl-wrap` sets `font-size: calc(1em * var(--sl-scale))`. `--sl-scale` is the
optical bump over the surrounding text (default `1.08`), because notation set
at exactly body size reads small. Size the element around the wrapper, or
multiply `--sl-scale` back in if you override the wrapper's font-size.

Normal weight is 500. Add `.sl-bold` to the wrapper for 700.

<SwaraRow notes="$srgM nu" bold />

## Editing mode

A read view leaves a half-typed marker out: a stray `@` in a published
composition is noise. An editor wants to see it. Pass `editing: true` and a
chhand symbol with no notes under it yet draws its full arc over empty slots,
sized like the real thing.

```ts
renderSwarlipi('@', 'hindi', { editing: true });
```

<SwaraRow notes="$s" editing />

## Plain text

For a clipboard or a text field, `toUnicodeNotation` gives the letters with
real combining diacritics: dots above and below for the octaves, a low line
for komal, a vertical line above for tivra.

```ts
import { toUnicodeNotation } from 'swarlipi';
toUnicodeNotation('Rl', 'hindi'); // "रे̱̣"
```

It is a one-way export for reading. Chhand, meend and ghaseet markers have no
plain-text form and are dropped, so the notation cannot be rebuilt from the
text — see [what is lost](/api#what-is-lost) for the full list. Whether the
marks are drawn depends on the destination font; the
[Swarlipi fonts](/fonts/) ship with the package for that reason.

## Next

- [Integration](/guide/integration): what a host does around the renderer,
  from a drawn caret to cross-beat glides and print.
- [Symbols](/notation/): every mark, live, in all four scripts.
- [Omenad compatibility](/notation/compatibility): why existing notation just works.
