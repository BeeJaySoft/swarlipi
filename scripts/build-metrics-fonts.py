#!/usr/bin/env python3
"""
Build the Swarlipi *metrics* fonts — one tiny, glyph-less font per script.

Why: the editor edits the raw ASCII (`su`, `{m}s`, `@sr`) in an `<input>` whose
text is transparent, with the rendered notation painted over it. The native
caret is positioned from the input's character ADVANCES, so if those advances
equal the rendered widths, the caret lands exactly where the user sees it —
which is how the old notation font behaved, where input and display were the
same face. These fonts carry no outlines at all, only advances:

  s r g m p d n (and R G D N M)  → the script letter's advance (ਰੇ = ਰ + ੇ …)
  u l U L                        → 0   (octave dots are zero-width marks)
  @ # $ % ^ & * ` ! ~            → 0   (chhand arcs hang under the group)
  q Q e E w W                    → 0   (meend pieces sit in absolute zones)
  { }                            → the inline kan brace width (see .sl-brace)
  ; ' [ ] \\                     → the script bol's advance
  0–9                            → the script digit's advance
  - _ ( ) , space                → fixed widths

Sources: Noto Sans <Script> `[wght]` slim variable fonts (OFL), instanced at
weights 500 and 700 — the renderer's normal and `.sl-bold` weights, since
the caret rides on these advances. Output: src/metrics/*.woff2 (bold faces
carry a -Bold suffix),
referenced by src/index.css. ~1–2 KB each; committed.

    pip install fonttools brotli
    python3 scripts/build-metrics-fonts.py
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

PKG = Path(__file__).resolve().parent.parent
OUT = PKG / "src" / "metrics"
CACHE = Path(os.environ.get("SWARLIPI_NOTO_CACHE", PKG / ".noto-cache"))

NOTO = {
    "punjabi": ("gurmukhi", "NotoSansGurmukhi", "v2.004", "Gurmukhi"),
    "hindi": ("devanagari", "NotoSansDevanagari", "v2.006", "Devanagari"),
    "bangla": ("bengali", "NotoSansBengali", "v3.011", "Bengali"),
    "english": ("latin-greek-cyrillic", "NotoSans", "v2.015", "Latin"),
}
# Letter/bol/digit tables are shared with the renderer — one source, so the
# advances baked into these fonts can never drift from what it draws.
TABLES = json.loads((PKG / "src" / "tables.json").read_text("utf-8"))
LETTERS = TABLES["letters"]
BOLS = TABLES["bols"]
DIGITS = TABLES["digits"]
ZERO = set("ulUL@#$%^&*`!~qQeEwW")
TEXT = TABLES["text"]

CSS = (PKG / "src" / "index.css").read_text("utf-8")


def css_em(selector: str, prop: str) -> float:
    """An em value out of the renderer's own stylesheet.

    The caret advances have to agree with what the CSS actually lays out, so
    the two widths that come from CSS rather than from the font are read from
    it rather than copied here.
    """
    block = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", CSS)
    if not block:
        raise SystemExit(f"{selector} not found in index.css")
    m = re.search(prop + r":\s*([0-9.]+)em", block.group(1))
    if not m:
        raise SystemExit(f"{prop} not found in {selector}")
    return float(m.group(1))


# .sl-brace is an inline-block of `width` em at `font-size` em, so its advance
# in wrapper-em is the product.
BRACE_EM = css_em(".sl-wrap .sl-brace", "width") * css_em(
    ".sl-wrap .sl-brace", "font-size"
)
# .sl-dash adds horizontal margins around the en dash.
DASH_MARGIN_EM = css_em(".sl-wrap .sl-dash", "margin-left") + css_em(
    ".sl-wrap .sl-dash", "margin-right"
)
UPEM = 1000
# The renderer paints at 500, and at 700 for `.sl-bold`. A face per weight is
# not a nicety: the caret rides on these advances, and Gurmukhi `s` is 608 units
# at 500 against 636 at 700, so a single 500 face drifted the cursor further
# from the glyphs with every bold note (#421).
WEIGHTS = {500: "Regular", 700: "Bold"}


def fetch(key: str) -> Path:
    repo, fam, ver, _ = NOTO[key]
    z = CACHE / f"{fam}-{ver}.zip"
    if not z.exists():
        url = f"https://github.com/notofonts/{repo}/releases/download/{fam}-{ver}/{fam}-{ver}.zip"
        print(f"  fetching {url}")
        CACHE.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(url) as r, open(z, "wb") as f:
            f.write(r.read())
    return z


def load_noto(key: str, weight: int) -> TTFont:
    repo, fam, ver, _ = NOTO[key]
    with zipfile.ZipFile(fetch(key)) as zf:
        want = f"{fam}/unhinted/slim-variable-ttf/{fam}[wght].ttf"
        name = next(n for n in zf.namelist() if n.endswith(want))
        font = TTFont(io.BytesIO(zf.read(name)))
    return instantiateVariableFont(font, {"wght": weight})


def advance_of(font: TTFont, text: str) -> int:
    """Advance of a cluster = sum of its codepoints' advances (marks are 0)."""
    cmap = font.getBestCmap()
    total = 0
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            raise SystemExit(f"{text!r}: U+{ord(ch):04X} missing in source font")
        total += font["hmtx"][g][0]
    scale = UPEM / font["head"].unitsPerEm
    return int(round(total * scale))


_FALLBACK: dict[int, TTFont] = {}


def advance_fallback(text: str, weight: int) -> int:
    """Advance from the Latin face, for a glyph the script font lacks.

    Noto Sans Bengali has no en dash, for instance, so the browser renders it
    from another family in the stack. We cannot know which, but the app also
    loads Noto Sans, so its advance is the closest honest estimate.
    """
    if weight not in _FALLBACK:
        _FALLBACK[weight] = load_noto("english", weight)
    return advance_of(_FALLBACK[weight], text)


def advance_text(font: TTFont, text: str, weight: int) -> int:
    """Advance of a passthrough character, falling back when it is missing."""
    cmap = font.getBestCmap()
    if all(ord(c) in cmap for c in text):
        return advance_of(font, text)
    return advance_fallback(text, weight)


def build(key: str, weight: int) -> Path:
    src = load_noto(key, weight)
    advances: dict[str, int] = {}
    for ch in map(chr, range(0x20, 0x7F)):
        low = ch.lower()
        if ch in ZERO:
            advances[ch] = 0
        elif low in LETTERS[key]:
            advances[ch] = advance_of(src, LETTERS[key][low])
        elif ch in "{}":
            advances[ch] = round(BRACE_EM * UPEM)
        elif ch in BOLS[key]:
            advances[ch] = advance_of(src, BOLS[key][ch])
        elif ch.isdigit():
            advances[ch] = advance_of(src, DIGITS[key][int(ch)])
        elif ch == "-":
            # .sl-dash adds margins around the en dash; both count toward the
            # advance the caret has to match.
            advances[ch] = advance_text(src, TEXT["-"], weight) + round(
                DASH_MARGIN_EM * UPEM
            )
        elif ch in TEXT:
            advances[ch] = advance_text(src, TEXT[ch], weight)
        elif ch in "(), ":
            # Plain text in .sl-t: the font's own advance, no CSS width.
            advances[ch] = advance_text(src, ch, weight)
        else:
            advances[ch] = 500  # never valid notation; stripped on input anyway

    names = {".notdef": 500, **{f"u{ord(c):04X}": advances[c] for c in advances}}
    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(list(names))
    fb.setupCharacterMap({ord(c): f"u{ord(c):04X}" for c in advances})
    empty = TTGlyphPen(None).glyph()
    # Font sanitizers (OTS) reject a zero-length glyf table, so .notdef gets a
    # real (never displayed) box; every mapped glyph stays empty.
    box = TTGlyphPen(None)
    box.moveTo((50, 0)); box.lineTo((50, 700)); box.lineTo((450, 700)); box.lineTo((450, 0)); box.closePath()
    glyphs = {n: empty for n in names}
    glyphs[".notdef"] = box.glyph()
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics({n: (adv, 0) for n, adv in names.items()})
    fb.setupHorizontalHeader(ascent=src["hhea"].ascent, descent=src["hhea"].descent)
    label = NOTO[key][3]
    style = WEIGHTS[weight]
    fb.setupNameTable(
        {
            "familyName": f"Swarlipi Metrics {label}",
            "styleName": style,
            "psName": f"SwarlipiMetrics{label}-{style}",
            "copyright": "Advances derived from Noto Sans (OFL); no outlines.",
        }
    )
    fb.setupOS2(sTypoAscender=src["OS/2"].sTypoAscender, sTypoDescender=src["OS/2"].sTypoDescender, usWinAscent=src["OS/2"].usWinAscent, usWinDescent=src["OS/2"].usWinDescent)
    fb.setupPost()
    fb.font.recalcTimestamp = False
    fb.font["head"].modified = fb.font["head"].created = 0
    OUT.mkdir(parents=True, exist_ok=True)
    # 500 keeps the bare name; only the bold face gets a suffix.
    suffix = "" if weight == 500 else f"-{style}"
    out = OUT / f"SwarlipiMetrics-{label}{suffix}.woff2"
    fb.font.flavor = "woff2"
    fb.save(out)
    print(f"  {out.name}: {out.stat().st_size} bytes; s={advances['s']} r={advances['r']} n={advances['n']} u={advances['u']} {{={advances['{']}")
    return out


def main() -> int:
    for key in NOTO:
        for weight in WEIGHTS:
            build(key, weight)
    return 0


if __name__ == "__main__":
    sys.exit(main())
