# Fonts

The renderer needs no notation font: letters are Unicode and every mark is CSS
or SVG. The plain-text export (`toUnicodeNotation`) is different. It is plain
Unicode too, letter plus combining mark, and whether the mark shows depends on
the font the destination uses. Most script fonts carry no Latin combining
marks, so a shaper mixes fonts inside the cluster and the mark comes out
misplaced or as a box.

The **Swarlipi fonts** close that gap: Noto Sans Gurmukhi, Devanagari and
Bengali with the six marks added and anchored to every letter, one variable
face per script (weight 400–700). Text copied from the renderer, set in the
matching Swarlipi face, shapes letters and marks from one font, so it reads
the same in Word, Pages, a PDF or a chat app that has the font installed. The
text stays plain Unicode: in any other font it still reads, with the marks
possibly dropped.

A font cannot stretch a chhand arc or a meend bar across letters. Those stay
the renderer's job. The fonts are for everything the renderer cannot reach.

There is no Swarlipi Latin font, because Latin already has one: **Noto Sans**
carries all six marks natively and anchors them, which is where the script
fonts borrow theirs from. Set copied `english` notation in Noto Sans and it is
correct. The catch is that not every Latin font has the tivra mark (U+030D) —
Apple's San Francisco and Times both lack it, so tivra in a system font falls
back to another face and can land off-centre.

## On the web

The package ships the fonts under `fonts/`, with a stylesheet of `@font-face`
rules. Any npm CDN serves them:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/swarlipi@0.1/fonts/swarlipi-fonts.css"
/>
```

```css
.copied-notation {
  font-family: 'Swarlipi Gurmukhi';
}
```

The families are `Swarlipi Gurmukhi`, `Swarlipi Devanagari` and
`Swarlipi Bengali`. `@0.1` follows patch releases, so a font fix reaches you;
pin an exact version (`swarlipi@0.1.0`) if you would rather nothing moved.

## On a desktop

Download a font, then double-click it to install:

<div class="sw-fonts">
  <a class="sw-font-dl" href="https://cdn.jsdelivr.net/npm/swarlipi@0.1/fonts/SwarlipiGurmukhi-Variable.ttf" download>
    <strong>Gurmukhi</strong><span>TTF · 53 KB</span>
  </a>
  <a class="sw-font-dl" href="https://cdn.jsdelivr.net/npm/swarlipi@0.1/fonts/SwarlipiDevanagari-Variable.ttf" download>
    <strong>Devanagari</strong><span>TTF · 277 KB</span>
  </a>
  <a class="sw-font-dl" href="https://cdn.jsdelivr.net/npm/swarlipi@0.1/fonts/SwarlipiBengali-Variable.ttf" download>
    <strong>Bengali</strong><span>TTF · 175 KB</span>
  </a>
</div>

Then choose the family in the application. The weight slider covers 400 to
700, matching the renderer's normal (500) and bold (700).

TTF is the install format: double-click works on macOS, Windows and Linux, and
Word, Pages and LibreOffice all read a variable TTF. The `.woff2` files beside
them are only for `@font-face`; nothing installs a WOFF2.

## Marks

| Mark       | Combining character                  | Renders as             |
| ---------- | ------------------------------------ | ---------------------- |
| taar       | U+0307 combining dot above           | dot above the letter   |
| ati taar   | U+0308 combining diaeresis           | two dots above         |
| mandra     | U+0323 combining dot below           | dot below              |
| ati mandra | U+0324 combining diaeresis below     | two dots below         |
| komal      | U+0331 combining macron below        | underline, letter-wide |
| tivra      | U+030D combining vertical line above | short bar above        |

Komal is drawn as an underline that spans the letter and its vowel sign, not
as a narrow diacritic, and the marks stack: tivra with a dot above it, komal
with a dot below it.

## Licence

The fonts derive from the Noto Sans script fonts and are released under the
SIL Open Font License 1.1; the licence file ships beside them. They are not
called Noto because that is a Reserved Font Name under the OFL.
