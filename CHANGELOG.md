# Changelog

All notable changes to `swarlipi`. Versions follow [semver](https://semver.org):
the rendered markup and the class names in `style.css` are part of the public
API, so a change to either that breaks a consumer's CSS is a breaking change.

## Unreleased

### Changed

- The source is public: [github.com/BeeJaySoft/swarlipi](https://github.com/BeeJaySoft/swarlipi)
  mirrors the package directory of the monorepo it is developed in, and is
  where issues and pull requests go. `repository` and `bugs` in `package.json`
  point there, and the docs site links to it.
- `typescript` and `@types/node` are declared as devDependencies, so a
  standalone checkout type-checks and builds `dist/` without the monorepo's
  hoisted copies.

## 0.2.0

### Added

- **Gujarati**, as a full script with its own face
  (`SwarlipiGujarati-Variable`, built from `NotoSansGujarati-v2.106`). Confirmed
  from a primary source rather than inferred: a Gujarati Praveshika syllabus
  book sets the Bhatkhande taal grid — chihn, matra and bol rows — in Gujarati
  letters, with Gujarati numerals for both the matras and the vibhag markers.
  In the renderer it behaves like Devanagari (ે is a non-spacing above-base sign
  on Re, ી a post-base spacing one on Ni), and Ma's ink is 0.603em against
  0.896em for the tallest letter, so the tivra bar tucks into that gap and the
  letters govern the dot line. No renderer change was needed.

- **`scripts/calibrate.py`** — the per-script mark calibration, derived from the
  pinned Noto faces instead of measured by hand in a browser console. This was
  the one step in the package that was neither reproducible nor checked in, and
  a canvas measurement silently reads whatever face the OS substituted, which is
  how three of four scripts were once calibrated against the wrong letter
  heights. `--check` diffs the stylesheet against the fonts; it reproduces all
  four previously hand-set scripts, which is what validates it.

  It also corrected the documented dot-line formula. The line has to clear both
  the tallest sargam ink _and_ the tivra bar above Ma, and the lower of the two
  governs. The Indic scripts are governed by the letters (Re and Ni tower over
  Ma); Latin is governed by the bar, because `M` is both its tivra letter and
  its tallest. One formula now covers both, where there used to be a hand-set
  exception.

### Fixed

- **The fonts now anchor every letter a mark can land on, not just the ones GDEF
  happens to classify.** `base_glyphs()` required GDEF glyph class 1, but
  GlyphClassDef is allowed to be incomplete and an unclassified glyph is a base
  by default. Noto Sans Gujarati is the case that exposed it: it classifies 564
  glyphs and leaves its own base letters out entirely, so the first Gujarati
  build anchored 484 conjuncts and **not one sargam letter** — the renderer was
  correct (it draws marks in CSS) and only the copied-out plain text was wrong,
  the same renderer/font split that hid the floating tivra bar in 0.1.3.

  Now only glyph class 3 (mark) is disqualifying, plus anything whose Unicode
  category is `Mn`/`Me`, so a mark can never also be a base and get positioned
  twice. This raises the anchored-base count in the existing faces too —
  Gurmukhi 314 → 458, Devanagari 518 → 876, Bengali 463 → 590 — which is why
  those three files change size in this release despite no change to their
  letters or calibration. Verified per face: all seven sargam letters anchored,
  no mark doubling as a base.

### Changed

- **Script ids name a letterform set, not a language.** `punjabi | hindi |
bangla | english` are now `gurmukhi | devanagari | bengali | latin`, joined by
  `assamese`, `gujarati` and `kannada`. The old names made the new scripts
  impossible to place coherently — and made Marathi unanswerable, since Marathi
  notation is Devanagari, the very same letters Hindi uses, so it belongs in a
  host app's language list mapped onto a script rather than duplicated here.

  **Not a breaking change.** The four old ids are accepted everywhere as
  aliases, resolved before any table lookup, and `swarlipiWrapperClass` emits
  the old class alongside the canonical one (`"sl-wrap sl-bengali sl-bangla"`),
  so a consumer stylesheet written against `.sl-bangla` still applies. Existing
  code, stored cookies and published pages need no migration. `SwarlipiScript`
  is now the canonical union; `SwarlipiScriptInput` is what the functions take.

### Considered and not added

A script is added only when Bhatkhande notation is actually **published** in it,
not when the script merely exists or the region has a Hindustani tradition. Both
of these were built and withdrawn for want of that evidence:

- **Assamese** — written in the Bengali script, differing in one sargam letter
  (ৰ U+09F0 for র), and it needs no face of its own: `Swarlipi Bengali` already
  carries ৰ with all six marks anchored, its ink height matches র exactly and
  its advance to within two font units, so Bengali's calibration applies
  unchanged. So it costs almost nothing — but no Bhatkhande notation published
  in Assamese was found, and Assam's own tradition is Borgeet, whose songs are
  set to ragas but not necessarily to tala, so Bhatkhande's tala apparatus does
  not fit cleanly. Roughly a ten-line change if a source turns up.

- **Kannada** — North Karnataka is Hindustani heartland (the Kirana gharana,
  Dharwad), but no Kannada-script notation book was confirmed. It is also the
  most expensive script measured so far, in two ways `calibrate.py` exposed:
  all seven of its sargam letters are 0.789em tall (ರೆ 0.809em), so there is no
  gap over Ma for the tivra bar and its dot line lands at -0.653em — past the
  0.45em of leading `line-height: 1.9` gives — and its run is 1.34× the width
  of the same notation in Gurmukhi (ಮ alone is 1156 units against Devanagari's
  598), which overflows a fixed-width container horizontally.

- **Odia** — unproven demand against the full cost of a new face.

- **Tamil, Telugu, Malayalam** — Carnatic, which uses a different notation
  system altogether; Bhatkhande is Hindustani.

- **Sinhala** — the Bhatkhande _system_ is confirmed in Sri Lankan music
  education from elementary to tertiary level, but not that the notation is set
  in Sinhala letters. It would also be the first script to need a renderer
  change: its ෙ (U+0DD9) is a pre-base spacing sign absent from
  `PREBASE_MATRA`.

## 0.1.3

### Releasing a font change

`@font-face` and the download links on the docs site point at the `@0.2`
range, so integrators get a font fix without editing a URL. The cost is that
jsDelivr caches a range URL per edge node (`s-maxage=43200`, so twelve hours
from each node's own fetch) and for a week in the browser
(`max-age=604800`). After publishing, purge **every** range URL — one `.woff2`
per face, which is what a page renders from, one `.ttf` per face, which is what
the download buttons hand out, and the stylesheet (eleven URLs at five faces):

```sh
for f in Gurmukhi Devanagari Bengali Gujarati Kannada; do
  curl -s "https://purge.jsdelivr.net/npm/swarlipi@0.2/fonts/Swarlipi$f-Variable.woff2" >/dev/null
  curl -s "https://purge.jsdelivr.net/npm/swarlipi@0.2/fonts/Swarlipi$f-Variable.ttf" >/dev/null
done
curl -s "https://purge.jsdelivr.net/npm/swarlipi@0.2/fonts/swarlipi-fonts.css" >/dev/null
```

Purging only the `.ttf` files leaves the specimen rendering the previous
release, which is the confusing half: the downloads are right and the page is
wrong. Check with `curl -sI <url> | grep x-jsd-version`, and remember a
browser that has already loaded the old file keeps it for a week — a hard
reload is the only thing that shifts it.

### Fixed

- **The tivra bar now sits on Ma, not on the dot line.** In the fonts, every
  above mark shared one anchor line per script — and that line has to clear the
  tallest ink in the script, Ni's matra. Ma is the shortest sargam letter
  (ink top 622 against 896/917), so a tivra bar floated ~0.33em over it: the
  same notation read correctly in the renderer and wrong when copied into Word
  or a PDF. `U+030D` now has its own mark class anchored off Ma's ink, one GAP
  clear of the letter, which is what the CSS renderer has always done with
  `--sl-tivra-top`. A taar dot stacked on a bar returns to the dot line, so the
  dots still read as one line whether or not a note carries a bar. Measured
  with `hb-shape` in all three scripts: bar ink bottom = Ma ink top + 40, the
  bar does not move when a dot is added, and a dot on a bar lands at the same
  y as a dot on a bare letter.

- **The tivra bar is the renderer's height.** Noto's `U+030D` is a 164-unit
  stroke where the renderer draws 260 (200 in Bengali), and a stubbier bar
  floating higher was the same mismatch twice over. The glyph's top edge moves
  and nothing else does: the ink bottom the anchors are computed from stays
  put, the 80-unit width already matched the renderer's 0.08em, and the weight
  deltas stay Noto's, so the bar still grows with the letters.

## 0.1.2

### Added

- **Every script font now carries Noto Sans's basic Latin** — letters, digits
  and punctuation, with the same weight axis and Noto's own kerning. Two
  reasons. Apple's Pages, Keynote and Numbers list only fonts that cover the
  system language, so on an English-language Mac a Latin-less font is missing
  from their font menu even though Font Book and the system Fonts panel show
  it; with Latin in the file, CoreText tags the font `en` and it appears. And a
  line that mixes English words with sargam — a heading, a section label — now
  stays in one face. Roman sargam (`english` notation) takes the six marks in
  these fonts too, though the above marks sit on the script's mark line, which
  is higher than Latin capitals; Noto Sans remains the natural face for
  Latin-only notation.

  The letters come from the `full` build in the same pinned Noto release the
  script letters come from; nothing is drawn or re-anchored differently. File
  size grows with the glyph count: Gurmukhi roughly 53 → 90 KB (TTF).

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
