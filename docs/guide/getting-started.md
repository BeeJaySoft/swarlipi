# Getting started

::: info Pre-release
Swarlipi is not on npm yet. This site documents the package as it will ship.
:::

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

const html = renderSwarlipi('@sr{g}m', 'punjabi');
// <span class="sl-ch"><span class="sl-n">ਸ</span>…</span>

element.className = swarlipiWrapperClass('punjabi'); // "sl-wrap sl-punjabi"
element.innerHTML = html;
```

<SwaraRow notes="@sr{g}m" />

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
for komal, a vertical line above for tivra. Kan becomes parentheses; chhand
and meend have no plain-text form and are left out.

```ts
import { toUnicodeNotation } from 'swarlipi';
toUnicodeNotation('Rl', 'hindi'); // "रे̱̣"
```

Whether the marks show depends on the destination font. A Swarlipi font that
shapes them everywhere is planned.

## Next

- [Integration](/guide/integration): what a host does around the renderer,
  from a drawn caret to cross-beat glides and print.
- [Symbol reference](/notation/): every mark, live, in all four scripts.
- [Omenad compatibility](/guide/compatibility): why existing notation just works.
