#!/usr/bin/env python3
"""
Build the Swarlipi fonts: one VARIABLE font per script (weight 400–700) —
Noto Sans <Script> + the six Bhatkhande combining marks, anchored to every
letter and carrying the same weight variation as the letters.

Why a font at all: the web renderer draws marks with CSS/SVG, but COPIED text
(`toUnicodeNotation`) is plain Unicode (letter + combining mark). Whether the
mark shows depends on the destination's shaper — Chromium picks one font per
cluster and the script fonts have no Latin combining marks, so the marks
vanish. A font that carries letters AND marks, with GPOS anchors, renders the
same text everywhere it is installed. It cannot stretch chhand arcs or meend
bars across letters; the renderer keeps that role.

Per script:
  1. Start from Noto Sans <Script> `[wght]` (unhinted slim variable, OFL,
     400–700). Its Indic shaping (GSUB/GPOS) and its `gvar` are untouched.
  2. Add the six marks from Noto Sans `[wght]` (same axis range, so the
     weight deltas transfer verbatim):
       U+0307 dot above (taar)        U+0323 dot below (mandra)
       U+0308 diaeresis (ati taar)    U+0324 diaeresis below (ati mandra)
       U+0331 macron below (komal)    U+030D vertical line above (tivra)
     Composite sources (uni0307 → dotaccent) are flattened to simple glyphs
     with the component's deltas plus the composite's offset deltas.
  3. Append MarkToBase + MarkToMark lookups to GPOS: every base glyph gets an
     above anchor on ONE uniform line per script (clearing the tallest matra —
     the same "uniform dot line" rule the CSS renderer follows) and a below
     anchor just under the baseline; marks stack (tivra + dot, komal + dot).
  4. Komal is an underline, not a diacritic: width-bucketed underline variants
     (plain / matra-extended) are chosen by a `calt` contextual substitution on
     the preceding base, so it spans the letter like the CSS renderer's.
  5. Rename (Noto is an OFL Reserved Font Name), lift the ascender so a mark
     line fits the line box, write the TTF (the install format) and a WOFF2
     (for `@font-face`), plus `swarlipi-fonts.css` with the rules, so a site
     needs one <link> — served from the npm package by any CDN (jsDelivr).

Reproducible: pinned Noto release zips are fetched into a cache dir. Fonts are
NOT committed — `fonts/` and `.noto-cache/` are git-ignored. The package's
`prepack` script runs this build, so `pnpm pack` / `pnpm publish` ship `fonts/`
inside the tarball without a binary ever entering git.

Needs Python 3.10+ with `fonttools` and `brotli` (pip install "fonttools[woff]").

    pnpm --filter swarlipi build:fonts              # → packages/swarlipi/fonts
    python3 scripts/build-fonts.py --out /tmp/x     # elsewhere
"""

from __future__ import annotations

import argparse
import copy
import io
import os
import sys
import urllib.request
import zipfile
from pathlib import Path

from fontTools.otlLib import builder as otl
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot
from fontTools.ttLib.tables.TupleVariation import TupleVariation

HERE = Path(__file__).resolve().parent
PKG = HERE.parent
OUT_DEFAULT = PKG / "fonts"

FAMILY = "Swarlipi"
VENDOR_ID = "SWLP"
VERSION = "0.1.1"
HOMEPAGE = "https://swarlipi.beejaysoft.com"

# Pinned upstream releases (notofonts GitHub). Bump deliberately.
NOTO = {
    "latin": ("latin-greek-cyrillic", "NotoSans", "v2.015"),
    "gurmukhi": ("gurmukhi", "NotoSansGurmukhi", "v2.004"),
    "devanagari": ("devanagari", "NotoSansDevanagari", "v2.006"),
    "bengali": ("bengali", "NotoSansBengali", "v3.011"),
}
SCRIPTS = {"gurmukhi": "Gurmukhi", "devanagari": "Devanagari", "bengali": "Bengali"}
SCRIPT_RANGES = {
    "gurmukhi": range(0x0A05, 0x0A4E),
    "devanagari": range(0x0905, 0x094D),
    "bengali": range(0x0985, 0x09CD),
}

MARKS = {
    0x0307: "above",  # taar dot
    0x0308: "above",  # ati taar
    0x030D: "above",  # tivra bar
    0x0323: "below",  # mandra dot
    0x0324: "below",  # ati mandra
    0x0331: "below",  # komal underline
}
GAP = 40  # units between a mark and what it sits on (1000 upem)
KOMAL_TOP = -90  # komal underline top edge (hugs the baseline like a text underline)
KOMAL_THICK = 60  # at wght 400; grows with the letters via gvar
BUCKET = 50  # underline width buckets (font units)
# Spacing vowel signs that widen a sargam cluster: post-base (right) and, in
# Bengali, pre-base (left, reordered before the consonant by the shaper).
RIGHT_MATRAS = {"gurmukhi": (0x0A40, 0x0A3E), "devanagari": (0x0940, 0x093E), "bengali": (0x09C0, 0x09BE)}
LEFT_MATRAS = {"gurmukhi": (), "devanagari": (), "bengali": (0x09C7, 0x09C8)}
NI = {"gurmukhi": 0x0A28, "devanagari": 0x0928, "bengali": 0x09A8}
ABOVE_CLEARANCE = 50  # above the tallest base/matra ink
BELOW_LINE = -70  # just under the baseline; sargam letters carry no below-matras


# ----------------------------------------------------------------------------- sources


def fetch(cache: Path, key: str) -> Path:
    repo, fam, ver = NOTO[key]
    z = cache / f"{fam}-{ver}.zip"
    if not z.exists():
        url = f"https://github.com/notofonts/{repo}/releases/download/{fam}-{ver}/{fam}-{ver}.zip"
        print(f"  fetching {url}")
        cache.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(url) as r, open(z, "wb") as f:
            f.write(r.read())
    return z


def load_variable(z: Path, fam: str) -> TTFont:
    with zipfile.ZipFile(z) as zf:
        want = f"{fam}/unhinted/slim-variable-ttf/{fam}[wght].ttf"
        names = [n for n in zf.namelist() if n.endswith(want)]
        if not names:
            raise SystemExit(f"{want} not in {z.name}")
        return TTFont(io.BytesIO(zf.read(names[0])))


def glyph_bounds(font: TTFont, name: str):
    gs = font.getGlyphSet()
    pen = BoundsPen(gs)
    gs[name].draw(pen)
    return pen.bounds


# ----------------------------------------------------------------------------- marks


def check_axes(a: TTFont, b: TTFont) -> None:
    ax = [(x.axisTag, x.minValue, x.defaultValue, x.maxValue) for x in a["fvar"].axes]
    bx = [(x.axisTag, x.minValue, x.defaultValue, x.maxValue) for x in b["fvar"].axes]
    if ax != bx:
        raise SystemExit(f"axis mismatch, deltas would not transfer: {ax} vs {bx}")


def flattened_mark(latin: TTFont, src: str):
    """Return (simple glyph, tuple variations) for a Noto Sans mark, flattening
    a single-component composite so the result needs no component glyph."""
    glyf = latin["glyf"]
    gvar = latin["gvar"].variations
    g = glyf[src]
    if not g.isComposite():
        return copy.deepcopy(g), copy.deepcopy(gvar.get(src, []))
    if len(g.components) != 1 or hasattr(g.components[0], "transform"):
        raise SystemExit(f"{src}: unsupported composite structure")
    comp = g.components[0]
    base = copy.deepcopy(glyf[comp.glyphName])
    base.coordinates.translate((comp.x, comp.y))
    # Full point list (incl. the 4 phantom points) of the component, so
    # IUP-inferred (None) deltas can be resolved before we edit them.
    coords, controls = glyf._getCoordinatesAndControls(comp.glyphName, latin["hmtx"].metrics)
    n = len(coords) - 4
    out = []
    own_vars = gvar.get(src, [])
    for tv in gvar.get(comp.glyphName, []):
        tv = copy.deepcopy(tv)
        tv.calcInferredDeltas(coords, controls.endPts)
        # The composite's own tuple (same peak) shifts component 0 as a whole.
        shift = (0, 0)
        for ov in own_vars:
            if ov.axes == tv.axes and ov.coordinates and ov.coordinates[0]:
                shift = ov.coordinates[0]
        pts = [
            (int(round(d[0] + shift[0])), int(round(d[1] + shift[1])))
            for d in tv.coordinates[:n]
        ]
        # Phantom points: zero advance, nothing to vary.
        out.append(TupleVariation(tv.axes, pts + [(0, 0)] * 4))
    return base, out


def add_marks(font: TTFont, latin: TTFont) -> dict[int, str]:
    check_axes(font, latin)
    # Tables decompile lazily against the glyph order; force them in BEFORE
    # the order grows, or gvar/hmtx come up one glyph short.
    for tag in ("glyf", "gvar", "hmtx", "cmap", "GDEF", "GPOS", "loca"):
        _ = font[tag]
    _ = latin["glyf"], latin["gvar"], latin["hmtx"]
    cmap = font.getBestCmap()
    lcmap = latin.getBestCmap()
    order = list(font.getGlyphOrder())
    added = {}
    for cp in MARKS:
        if cp in cmap:
            added[cp] = cmap[cp]
            continue
        src = lcmap[cp]
        name = src if src not in order else f"{src}.ss"
        glyph, variations = flattened_mark(latin, src)
        order.append(name)
        font.setGlyphOrder(order)
        glyph.recalcBounds(font["glyf"])
        font["glyf"][name] = glyph
        # lsb MUST equal xMin: renderers shift an outline so xMin lands on
        # the hmtx bearing, so a 0 here would drag a centred mark rightwards.
        font["hmtx"][name] = (0, int(glyph.xMin))
        font["gvar"].variations[name] = variations
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[cp] = name
        added[cp] = name
    # HVAR indexes advance deltas by glyph id; rather than extend it for the
    # new glyphs, drop it — shapers then derive advances from gvar phantom
    # points, which is exact.
    if "HVAR" in font:
        del font["HVAR"]
    gdef = font["GDEF"].table
    if gdef.GlyphClassDef is None:
        gdef.GlyphClassDef = ot.GlyphClassDef()
        gdef.GlyphClassDef.classDefs = {}
    for name in added.values():
        gdef.GlyphClassDef.classDefs[name] = 3
    return added


# ----------------------------------------------------------------------------- komal underline


def komal_variants(
    font: TTFont, komal: str, script: str
) -> tuple[list[str], dict[str, int]]:
    """Komal is an UNDERLINE, not a diacritic: it should span the letter (and
    its spacing matra) the way the CSS renderer draws it. A mark glyph has one
    fixed shape, so build width-bucketed variants — centred, right-extended
    (base + post-base matra), left-extended (Bengali pre-base matra) — and pick
    them with a contextual substitution keyed on the preceding base glyph.
    Returns (variant glyph names, {post-base matra glyph: advance})."""
    for tag in ("glyf", "gvar", "hmtx", "GSUB"):
        _ = font[tag]
    cmap = font.getBestCmap()
    # Thickness growth: reuse the macron's own top-edge delta at wght max.
    grow = 0
    for tv in font["gvar"].variations.get(komal, []):
        ys = [d[1] for d in tv.coordinates if d]
        if ys:
            grow = max(grow, int(max(ys)))
    grow = grow or 25

    order = list(font.getGlyphOrder())
    made: dict[str, str] = {}

    def variant(width: int, left: int = 0, right: int = 0) -> str:
        """Underline glyph. Plain: centred on the consonant's advance centre.
        left (Bengali pre-base matra): extended left by the matra advance.
        right (post-base matra): the shaper attaches the mark to the MATRA (a
        spacing glyph, so it counts as the base), so this one is anchored at
        the matra's advance centre and reaches back over the consonant."""
        name = f"{komal}.w{width}" + (f"l{left}" if left else "") + (f"r{right}" if right else "")
        if name in made:
            return name
        if right:
            x0, x1 = -right // 2 - width, right // 2
        else:
            x0, x1 = -width // 2 - left, width // 2
        pen = TTGlyphPen(None)
        pen.moveTo((x0, KOMAL_TOP - KOMAL_THICK))
        pen.lineTo((x0, KOMAL_TOP))
        pen.lineTo((x1, KOMAL_TOP))
        pen.lineTo((x1, KOMAL_TOP - KOMAL_THICK))
        pen.closePath()
        order.append(name)
        font.setGlyphOrder(order)
        glyph = pen.glyph()
        glyph.recalcBounds(font["glyf"])
        font["glyf"][name] = glyph
        font["hmtx"][name] = (0, int(glyph.xMin))  # lsb = xMin, see add_marks
        # Bold: the bar thickens downward (top edge stays put under the letter).
        font["gvar"].variations[name] = [
            TupleVariation({"wght": (0, 1.0, 1.0)}, [(0, -grow), (0, 0), (0, 0), (0, -grow)] + [(0, 0)] * 4)
        ]
        font["GDEF"].table.GlyphClassDef.classDefs[name] = 3
        made[name] = name
        return name

    def bucket(adv: int) -> int:
        return max(300, min(1100, int(round(adv / BUCKET)) * BUCKET))

    bases = base_glyphs(font)
    by_bucket: dict[int, list[str]] = {}
    for g in bases:
        by_bucket.setdefault(bucket(font["hmtx"][g][0]), []).append(g)
    right = {cmap[cp]: font["hmtx"][cmap[cp]][0] for cp in RIGHT_MATRAS[script] if cp in cmap}
    left = {cmap[cp]: font["hmtx"][cmap[cp]][0] for cp in LEFT_MATRAS[script] if cp in cmap}

    gsub = font["GSUB"].table
    lookups = gsub.LookupList.Lookup

    def single_to(target: str):
        # Nested lookups must already sit in the LookupList (with their index)
        # before the chain that references them is built.
        b = otl.SingleSubstBuilder(font, None)
        b.mapping[komal] = target
        lookups.append(b.build())
        b.lookup_index = len(lookups) - 1
        return b

    sub = otl.ChainContextSubstBuilder(font, None)
    # The komal follows its consonant DIRECTLY only when the note has no
    # non-spacing matra: रे̱ / ਰੇ̱ put the e-matra, a mark, between them, and a
    # default-flag chain sees that matra, not the base, in its backtrack — so
    # komal Re, the commonest komal note, kept the narrow macron. Filter the
    # lookup to the komal alone: every other mark is skipped while matching,
    # and the komal itself is still the input glyph.
    sub.lookupflag = 0x0010  # UseMarkFilteringSet
    sub.markFilterSet = mark_filter_set(font, komal)
    komal_set = {komal}
    # Most specific first: a chain lookup applies the first matching rule.
    for w, glyphs in sorted(by_bucket.items()):
        for m, adv in right.items():
            sub.rules.append(
                otl.ChainContextualRule([set(glyphs), {m}], [komal_set], [], [[single_to(variant(w, right=adv))]])
            )
        for m, adv in left.items():
            sub.rules.append(
                otl.ChainContextualRule([{m}, set(glyphs)], [komal_set], [], [[single_to(variant(w, left=bucket(adv)))]])
            )
    for w, glyphs in sorted(by_bucket.items()):
        sub.rules.append(otl.ChainContextualRule([set(glyphs)], [komal_set], [], [[single_to(variant(w))]]))

    idx = len(lookups)
    lookups.append(sub.build())
    gsub.LookupList.LookupCount = len(lookups)
    register_feature(gsub, "calt", idx)
    return list(made), right


def mark_filter_set(font: TTFont, glyph: str) -> int:
    """Register {glyph} as a GDEF mark glyph set and return its index."""
    gdef = font["GDEF"].table
    new = otl.buildMarkGlyphSetsDef([{glyph}], font.getReverseGlyphMap())
    if getattr(gdef, "MarkGlyphSetsDef", None) is None:
        gdef.MarkGlyphSetsDef = new
    else:
        gdef.MarkGlyphSetsDef.Coverage.extend(new.Coverage)
        gdef.MarkGlyphSetsDef.MarkSetCount = len(gdef.MarkGlyphSetsDef.Coverage)
    gdef.Version = max(gdef.Version, 0x00010002)
    return gdef.MarkGlyphSetsDef.MarkSetCount - 1


def register_feature(table, tag: str, idx: int) -> None:
    """Add lookup `idx` under `tag` for EVERY script/langsys, extending existing
    feature records where present and adding them where not."""
    feats = table.FeatureList.FeatureRecord

    def new_feature() -> int:
        rec = ot.FeatureRecord()
        rec.FeatureTag = tag
        rec.Feature = ot.Feature()
        rec.Feature.FeatureParams = None
        rec.Feature.LookupListIndex = [idx]
        rec.Feature.LookupCount = 1
        feats.append(rec)
        return len(feats) - 1

    for rec in feats:
        if rec.FeatureTag == tag:
            rec.Feature.LookupListIndex.append(idx)
            rec.Feature.LookupCount = len(rec.Feature.LookupListIndex)
    for sr in table.ScriptList.ScriptRecord:
        langsys = [sr.Script.DefaultLangSys] + [lr.LangSys for lr in sr.Script.LangSysRecord]
        for ls in langsys:
            if ls is None or any(feats[fi].FeatureTag == tag for fi in ls.FeatureIndex):
                continue
            ls.FeatureIndex.append(new_feature())
            ls.FeatureCount = len(ls.FeatureIndex)
    table.FeatureList.FeatureCount = len(feats)


# ----------------------------------------------------------------------------- anchors


def base_glyphs(font: TTFont) -> list[str]:
    cd = font["GDEF"].table.GlyphClassDef.classDefs
    out = []
    for name in font.getGlyphOrder():
        if cd.get(name) != 1 or font["hmtx"][name][0] == 0:
            continue
        if glyph_bounds(font, name) is None:
            continue
        out.append(name)
    return out


def script_ink_top(font: TTFont, unicodes: range) -> int:
    cmap = font.getBestCmap()
    top = 0
    for cp in unicodes:
        g = cmap.get(cp)
        b = glyph_bounds(font, g) if g else None
        if b:
            top = max(top, int(round(b[3])))
    return top


def build_gpos(
    font: TTFont,
    marks: dict[int, str],
    above_line: int,
    komal_variants_: list[str],
    right_matras: dict[str, int],
    ni_adv: int,
) -> None:
    # Mark anchors: the point on the mark that lands on the base anchor. Above
    # marks hang GAP above the line (anchor = their bottom − GAP); below marks
    # hang GAP below (anchor = their top + GAP).
    # Three mark classes: 'above' (dots/tivra, ink-centred), 'below' (dots,
    # ink-centred), 'under' (komal underline, ADVANCE-centred like a text
    # underline). Anchor = the point on the mark that lands on the base anchor.
    mark_defs, mark_bounds = {}, {}
    sides = {marks[cp]: side for cp, side in MARKS.items()}
    sides[marks[0x0331]] = "under"
    sides.update({g: "under" for g in komal_variants_})
    for name, side in sides.items():
        b = glyph_bounds(font, name)
        mark_bounds[name] = b
        if side == "above":
            mark_defs[name] = ("above", otl.buildAnchor(0, int(b[1]) - GAP))
        elif side == "under":
            # Hug the letter: the underline's top sits at KOMAL_TOP.
            mark_defs[name] = ("under", otl.buildAnchor(0, int(b[3]) + (BELOW_LINE - KOMAL_TOP)))
        else:
            mark_defs[name] = ("below", otl.buildAnchor(0, int(b[3]) + GAP))

    mb = otl.MarkBasePosBuilder(font, None)
    mb.marks = dict(mark_defs)
    for name in base_glyphs(font):
        b = glyph_bounds(font, name)
        cx = int(round((b[0] + b[2]) / 2))
        adv = font["hmtx"][name][0]
        mb.bases[name] = {
            "above": otl.buildAnchor(cx, above_line),
            "below": otl.buildAnchor(cx, BELOW_LINE),
            "under": otl.buildAnchor(adv // 2, BELOW_LINE),
        }
    # Spacing post-base matras (ੀ ी ী) have no glyph class in Noto, so the
    # shaper treats them as the base of a following mark. Give them anchors:
    # dots centre on the consonant before them (Ni — the only sargam letter
    # that takes one), the underline on the matra's own advance (the extended
    # variant reaches back over the consonant).
    for name, adv in right_matras.items():
        mb.bases[name] = {
            "above": otl.buildAnchor(-ni_adv // 2, above_line),
            "below": otl.buildAnchor(-ni_adv // 2, BELOW_LINE),
            "under": otl.buildAnchor(adv // 2, BELOW_LINE),
        }

    # Mark-to-mark: an above mark on an above mark sits GAP above it; a below
    # mark on a below mark hangs GAP under it. A komal + taar pair uses
    # different classes, so both fall back to the base — correct.
    mm = otl.MarkMarkPosBuilder(font, None)
    mm.marks = dict(mark_defs)
    for name, side in sides.items():
        b = mark_bounds[name]
        if side == "above":
            mm.baseMarks[name] = {"above": otl.buildAnchor(0, int(b[3]) + GAP)}
        else:
            # A dot below a komal underline hangs GAP under it (class 'below'
            # marks attach to 'under' marks and vice versa via the same anchor).
            mm.baseMarks[name] = {
                "below": otl.buildAnchor(0, int(b[1]) - GAP),
                "under": otl.buildAnchor(0, int(b[1]) - GAP),
            }

    gpos = font["GPOS"].table
    lookups = gpos.LookupList.Lookup
    base_idx = len(lookups)
    lookups.append(mb.build())
    mkmk_idx = len(lookups)
    lookups.append(mm.build())
    gpos.LookupList.LookupCount = len(lookups)

    register_feature(gpos, "mark", base_idx)
    register_feature(gpos, "mkmk", mkmk_idx)


# ----------------------------------------------------------------------------- metadata


def font_revision(version: str) -> float:
    """`head.fontRevision` is a 16.16 Fixed, so semver folds to major.MMPP:
    0.1.1 -> 0.0101. Distinct per release and ordered for minor/patch < 100.
    Name ID 5 keeps the readable semver string. Noto's own 2.004 was inherited
    here through 0.1.0, which made every build the same revision to a host."""
    major, minor, patch = (int(part) for part in version.split("."))
    return major + minor / 100 + patch / 10_000


def rename(font: TTFont, script_label: str, noto_family: str) -> None:
    family = f"{FAMILY} {script_label}"
    ps_prefix = f"{FAMILY}{script_label}"
    name = font["name"]
    old_copyright = name.getDebugName(0) or ""
    # Rewrite every record mentioning the reserved name, so fvar instance and
    # STAT strings ("Noto Sans Gurmukhi Bold", "NotoSansGurmukhi-Bold") follow.
    for rec in list(name.names):
        text = rec.toUnicode()
        if "Noto" not in text:
            continue
        text = (
            text.replace(noto_family, ps_prefix)
            .replace(f"Noto Sans {script_label}", family)
            .replace("Noto Sans", FAMILY)
        )
        if "Noto" in text:
            name.names.remove(rec)
            continue
        rec.string = text
    fixed = {
        0: f"{old_copyright} {FAMILY} marks and anchors © 2026 BeeJaySoft.",
        1: family,
        2: "Regular",
        3: f"{VERSION};{VENDOR_ID};{ps_prefix}-Regular",
        4: family,
        5: f"Version {VERSION}",
        6: f"{ps_prefix}-Regular",
        8: FAMILY,
        9: f"Noto Project (letters); {FAMILY} (notation marks)",
        11: HOMEPAGE,
        13: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
        14: "https://openfontlicense.org",
        16: family,
        17: "Regular",
        25: ps_prefix,  # variations PostScript name prefix
    }
    for nid, value in fixed.items():
        name.setName(value, nid, 3, 1, 0x409)
    font["OS/2"].achVendID = VENDOR_ID
    font["head"].fontRevision = font_revision(VERSION)


def name_instances(font: TTFont, ps_prefix: str) -> None:
    """Dedupe the named instances and give each one a PostScript name.

    Noto's slim-variable ships every instance TWICE (verified in the source),
    which is malformed, and none of them carries a `postscriptNameID` — so a
    host has to invent one, and macOS synthesises `Family-Regular_Bold` from
    the default instance's name. Naming them properly yields the expected
    `SwarlipiGurmukhi-Bold`, and a font panel that de-duplicates on these
    names has four distinct ones to work with instead of four copies of the
    default's.
    """
    fvar = font["fvar"]
    name = font["name"]
    default_ps = name.getDebugName(6)
    kept, seen = [], set()
    for inst in fvar.instances:
        key = tuple(sorted(inst.coordinates.items()))
        if key in seen:
            continue
        seen.add(key)
        style = (name.getDebugName(inst.subfamilyNameID) or "Regular").replace(" ", "")
        ps = f"{ps_prefix}-{style}"
        # The default instance shares name ID 6, so the two can never disagree.
        inst.postscriptNameID = (
            6 if ps == default_ps else name.addName(ps, platforms=((3, 1, 0x409),))
        )
        kept.append(inst)
    fvar.instances = kept


def lift_ascender(font: TTFont, marks: dict[int, str], above_line: int) -> None:
    """hhea/typo ascender (line spacing) covers ONE mark on the dot line;
    usWinAscent (Windows clipping) covers the full tivra + dot stack."""
    dot_h = tivra_h = 0
    for cp, side in MARKS.items():
        if side != "above":
            continue
        b = glyph_bounds(font, marks[cp])
        h = int(b[3] - b[1])
        if cp == 0x030D:
            tivra_h = h
        else:
            dot_h = max(dot_h, h)
    single = above_line + GAP + dot_h + 20
    full = above_line + GAP + tivra_h + GAP + dot_h + 20
    font["hhea"].ascent = max(font["hhea"].ascent, single)
    font["OS/2"].sTypoAscender = max(font["OS/2"].sTypoAscender, single)
    font["OS/2"].usWinAscent = max(font["OS/2"].usWinAscent, full)


# ----------------------------------------------------------------------------- build


def build_one(cache: Path, script: str, out: Path) -> Path:
    repo, fam, ver = NOTO[script]
    font = load_variable(fetch(cache, script), fam)
    latin = load_variable(fetch(cache, "latin"), NOTO["latin"][1])
    marks = add_marks(font, latin)
    variants, right_matras = komal_variants(font, marks[0x0331], script)
    above_line = script_ink_top(font, SCRIPT_RANGES[script]) + ABOVE_CLEARANCE
    ni_adv = font["hmtx"][font.getBestCmap()[NI[script]]][0]
    build_gpos(font, marks, above_line, variants, right_matras, ni_adv)
    lift_ascender(font, marks, above_line)
    rename(font, SCRIPTS[script], fam)
    name_instances(font, f"{FAMILY}{SCRIPTS[script]}")
    # Keep glyph names in the file (Noto Sans Gurmukhi ships a nameless post 3),
    # so hb-shape and font tools show `uni0331.w550` rather than a glyph id.
    post = font["post"]
    post.formatType = 2.0
    post.extraNames, post.mapping = [], {}
    font["maxp"].numGlyphs = len(font.getGlyphOrder())
    font.recalcTimestamp = False  # deterministic output
    ttf = out / f"{FAMILY}{SCRIPTS[script]}-Variable.ttf"
    font.save(ttf)
    font.flavor = "woff2"
    woff2 = ttf.with_suffix(".woff2")
    font.save(woff2)
    print(
        f"  {ttf.name}: above line {above_line}, {len(base_glyphs(font))} bases anchored, "
        f"{ttf.stat().st_size // 1024} KB ttf / {woff2.stat().st_size // 1024} KB woff2"
    )
    return ttf


def write_license(cache: Path, source: str, out: Path) -> None:
    # Any Noto zip carries the same OFL text; read it from one this run already
    # fetched rather than pulling a second script's 12MB for a text file.
    with zipfile.ZipFile(fetch(cache, source)) as zf:
        ofl = next(n for n in zf.namelist() if n.endswith("OFL.txt"))
        text = zf.read(ofl).decode("utf-8")
    header = (
        f"{FAMILY} fonts — derived from the Noto Sans script fonts "
        "(Copyright the Noto Project Authors, https://github.com/notofonts) "
        "with Bhatkhande notation marks and anchors added.\n"
        '"Noto" is a Reserved Font Name under the OFL, which is why these '
        "fonts are not called Noto.\n\n"
    )
    (out / "LICENSE").write_text(header + text)


def write_css(out: Path, labels: list[str]) -> None:
    """One @font-face per script BUILT, WOFF2 first, TTF as the fallback. Only
    the faces actually written: advertising a face this run skipped would send
    every page that links the stylesheet after two 404s. Relative
    URLs, so the file works from a CDN directory listing of the npm package
    (cdn.jsdelivr.net/npm/swarlipi@<version>/fonts/swarlipi-fonts.css) as well
    as from a local copy of `fonts/`."""
    rules = [
        "/* Swarlipi fonts: Noto Sans script letters + Bhatkhande marks with GPOS",
        "   anchors, one variable face per script (weight 400-700). Generated by",
        "   scripts/build-fonts.py; OFL, see LICENSE beside this file. */",
    ]
    for label in labels:
        base = f"{FAMILY}{label}-Variable"
        rules.append(
            "@font-face {\n"
            f'  font-family: "{FAMILY} {label}";\n'
            f'  src: url("{base}.woff2") format("woff2"), url("{base}.ttf") format("truetype");\n'
            "  font-weight: 400 700;\n"
            "  font-display: swap;\n"
            "}"
        )
    (out / f"{FAMILY.lower()}-fonts.css").write_text("\n".join(rules) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(OUT_DEFAULT))
    ap.add_argument("--cache", default=os.environ.get("SWARLIPI_NOTO_CACHE", str(PKG / ".noto-cache")))
    ap.add_argument("--scripts", default=",".join(SCRIPTS))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cache = Path(args.cache)
    scripts = [s for s in args.scripts.split(",") if s]
    for script in scripts:
        build_one(cache, script, out)
    write_css(out, [SCRIPTS[s] for s in scripts])
    write_license(cache, scripts[0] if scripts else "gurmukhi", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
