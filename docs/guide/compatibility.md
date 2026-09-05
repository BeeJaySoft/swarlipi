# Omenad compatibility

Swarlipi's input is the character mapping of the **Omenad Bhatkhande fonts**,
OmeBhatkhande Punjabi, Hindi, Bangla and English. Every ASCII character means
what it meant in those fonts, so notation typed for them renders in Swarlipi
unchanged. There is nothing to convert and nothing to re-key, and the four
scripts correspond to the four faces.

What changes is the output. A font substitutes glyphs for the characters you
typed, so the text underneath stays `sRgM`. Swarlipi produces the real letters
in the real script, with the marks drawn around them.

<SwaraRow notes="sRgM {p}d nu-" />

## The mapping

Every symbol, with a live example in the script you pick. This table and the
notation app's in-editor guide render from the same data, `swarlipi/reference`,
so the two cannot drift.

<SheetControls />

<SymbolTable />

## What is different by design

- **Proportional text.** The fonts were monospaced glyph by glyph; Swarlipi
  lets the browser space real letters, so a crowded beat like `sssr` sets
  evenly without kerning tricks.
- **Marks that scale.** Arcs stretch to their group, dots and bars are drawn
  in `em`, and everything follows the font size.
- **Glides follow the notes.** A meend's geometry comes from the notes it
  joins, never from where the marker was typed: `qs` and `sq` are the same
  picture.
- **Not a font.** Nothing to install, and nothing to embed in a PDF. The
  plain-text export uses Unicode combining marks instead.

## Acknowledgement

Swarlipi is inspired by the [Omenad](https://github.com/omenad/fonts)
Bhatkhande fonts. It keeps their character mapping, so notation typed for those
fonts renders unchanged, and its chhand arc and meend hook shapes are traced
from the OmeBhatkhande typefaces, which are released under the SIL Open Font
License. Everything else, the letters, the marks and the layout, is Unicode
text and CSS.
