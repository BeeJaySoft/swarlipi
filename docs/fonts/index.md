# Fonts

Three variable fonts, one per Indic script, so notation copied out of the
renderer keeps its marks in Word, Pages, a PDF or a chat app. Download one,
double-click it, choose the family in the application.

<FontDownloads />

<FontSpecimen />

TTF is the install format: double-click works on macOS, Windows and Linux, and
Word, Pages and LibreOffice all read a variable TTF. The `.woff2` files beside
them are only for `@font-face`; nothing installs a WOFF2.

## The four faces

| Family                | Script     | Weight axis | WOFF2  |
| --------------------- | ---------- | ----------- | ------ |
| `Swarlipi Gurmukhi`   | Gurmukhi   | 400 – 700   | 43 KB  |
| `Swarlipi Devanagari` | Devanagari | 400 – 700   | 110 KB |
| `Swarlipi Bengali`    | Bengali    | 400 – 700   | 101 KB |
| `Swarlipi Gujarati`   | Gujarati   | 400 – 700   | 87 KB  |

There is no Swarlipi Latin, because Latin already has one: **Noto Sans**
carries all six marks natively and anchors them, which is where the script
fonts borrow theirs from. Set copied `latin` notation in Noto Sans and it is
correct. Roman sargam set in a Swarlipi script font works too, though its above
marks sit on that script's mark line, higher than Latin capitals. The catch
with system fonts is that not every Latin font has the tivra mark (U+030D) —
Apple's San Francisco and Times both lack it, so tivra in a system font falls
back to another face and can land off-centre.

Each script font also carries **Noto Sans's basic Latin** — letters, digits and
punctuation on the same weight axis — so a heading or a section label can sit
in the same face as the sargam. It is also what gets the fonts into Apple's
menus: Pages, Keynote and Numbers list only fonts that cover the system
language, so on an English-language Mac a font without Latin is missing from
their font popup even though Font Book and the system Fonts panel (Format →
Font → Show Fonts) show it.

## On the web

The package ships the fonts under `fonts/`, with a stylesheet of `@font-face`
rules. Any npm CDN serves them:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/swarlipi@0.2/fonts/swarlipi-fonts.css"
/>
```

```css
.copied-notation {
  font-family: 'Swarlipi Gurmukhi';
}
```

## Why they exist

The renderer needs no notation font: letters are Unicode and every mark is CSS
or SVG. The plain-text export (`toUnicodeNotation`) is different. It is plain
Unicode too, letter plus combining mark, and whether the mark shows depends on
the font the destination uses. Most script fonts carry no Latin combining
marks, so a shaper mixes fonts inside the cluster and the mark comes out
misplaced or as a box.

The Swarlipi fonts close that gap: Noto Sans Gurmukhi, Devanagari and Bengali
with the six marks added and anchored to every letter. Text copied from the
renderer, set in the matching Swarlipi face, shapes letters and marks from one
font, so it reads the same in Word, Pages, a PDF or a chat app that has the
font installed. The text stays plain Unicode: in any other font it still reads,
with the marks possibly dropped.

A font cannot stretch a chhand arc or a meend bar across letters. Those stay
the renderer's job. The fonts are for everything the renderer cannot reach.

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
