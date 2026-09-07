# Changelog

All notable changes to `swarlipi`. Versions follow [semver](https://semver.org):
the rendered markup and the class names in `style.css` are part of the public
API, so a change to either that breaks a consumer's CSS is a breaking change.

## 0.1.1

### Fixed

- **Fonts: the named instances are deduplicated and each carries a PostScript
  name.** Noto's slim-variable ships every instance twice, and none of them
  has a `postscriptNameID`, so a host has to invent one — macOS synthesised
  `SwarlipiGurmukhi-Regular_Bold` from the default instance. The four styles
  are now distinct and named `SwarlipiGurmukhi-Regular` / `-Medium` /
  `-SemiBold` / `-Bold`, which is also what a font panel that de-duplicates
  on those names needs.
- The font version is 0.1.1 in `head.fontRevision` as well as the version
  string. 0.1.0 had left the revision at Noto's inherited 2.004, so a host
  comparing revisions saw every build as the same font.

Nothing changed in the renderer or the outlines: shaping, mark placement and
the glyph set are identical to 0.1.0.

## 0.1.0

First published release.

### The renderer

- `renderSwarlipi(notes, script, options?)` turns the Omenad Bhatkhande ASCII
  grammar into an HTML string: real Unicode letters in Gurmukhi, Devanagari,
  Bengali or Latin, with every notation mark drawn by CSS and inline SVG.
  There is no notation font.
- Swaras, komal and tivra, four octaves, kan, chhand over two to eight slots,
  meend and ghaseet, dashes, bols, murki, digits and half-typed markers.
- `swarlipiWrapperClass(script)` for the class list the receiving element
  needs, and `swarlipi/style.css` for the stylesheet it needs.
- Framework-agnostic and SSR-safe: a pure function, no DOM access, zero
  runtime dependencies.
- Every rendered piece carries `data-s` / `data-e`, the character range of the
  input it came from, so an editor can draw a caret from the render.
- `options.noteClass` colours individual notes; marks inherit through
  `currentColor`.
- `options.editing` draws half-finished markers over empty slots.

### Cross-beat glides

- `swarlipi/bridge` joins the per-beat hook and bar fragments a glide leaves
  in each beat. `measureBridges` returns one bar per gap along a span, two
  where a span wraps to the next row; `bridgeElement`, or `bridgeStyle` /
  `bridgeClass` / `bridgeMarkup` for a template layer.
- Each bar carries a measured `calc(% + px)` fallback and the anchor names of
  the zones it joins. Where CSS anchor positioning is supported the stylesheet
  pins the bar to those zones, so print re-derives the geometry with no JS.
- Which beats pair is the host's rule; the bridge takes plain `{ from, to }`.
- `planBridges` is the same geometry without the DOM — rectangles in, bars out
  — for a host that already holds the layout, and so the decisions it makes
  are unit-tested.

### Plain text

- `toUnicodeNotation(notes, script)` exports letters plus real combining
  marks, for a clipboard or a text field. A one-way export for reading:
  chhand, meend and ghaseet markers are dropped, so the notation cannot be
  rebuilt from it.

### Fonts

- Three variable fonts ship under `fonts/` — Gurmukhi, Devanagari and Bengali,
  weight 400 to 700 — as TTF to install and WOFF2 for `@font-face`, with a
  ready stylesheet and the OFL licence. They carry the six Bhatkhande
  combining marks with GPOS anchors, so copied plain text keeps its marks in
  Word, Pages or a PDF. Built from pinned Noto Sans releases at publish time.
- No Latin font: Noto Sans already carries all six marks with anchors.

### Also

- `swarlipi/samples` and `swarlipi/reference` export the sample set and the
  symbol mapping as data, so a host can render its own reference sheet.
- Docs, a symbol reference and a playground at
  [swarlipi.beejaysoft.com](https://swarlipi.beejaysoft.com).

### Known limits

- A font cannot stretch a chhand arc or a meend bar across letters, so the
  renderer keeps that job and the plain-text export cannot carry them.
- Bridge geometry drifts slightly at a custom print scale.
- Anchor x in the fonts is static (the ink centre at Regular), so a bold dot
  can sit a few units off centre.
- The fonts are untested on Windows Word and LibreOffice.
