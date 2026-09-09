#!/usr/bin/env python3
"""Derive the renderer's per-script mark calibration from the pinned Noto faces.

`src/index.css` positions every Bhatkhande mark in em units against the script's
letter box, and those numbers used to be measured by hand in a browser console.
That is the one step in this package that was neither reproducible nor checked
in: a canvas measurement silently reads whatever face the OS substituted, which
is exactly how three of the four scripts once ended up calibrated against the
wrong letter heights (see the `--font-sl` notes in index.css).

This reads the metrics straight out of the pinned Noto source that
`build-fonts.py` already downloads, so there is no font resolution to get wrong
and no browser in the loop. Run `--check` to compare the CSS against the fonts.

  python3 scripts/calibrate.py                 # print a CSS block per script
  python3 scripts/calibrate.py --check         # diff CSS against the fonts

`--check` allows 0.015em of drift by design, because the shipped values are the
analytic ones plus a deliberate sub-pixel nudge: the dot lines were set for >=1px
clearance at the read view's 17px, where the dot's border snaps up a pixel and
eats any sub-pixel gap (see .sl-gurmukhi in index.css). 0.015em is ~0.26px there,
so the band tolerates the nudge while still catching a real change — a Noto
release that moves a letter height, or a new script calibrated wrongly.

Known and intentional: Latin's --sl-dot-a-top is 0.013em higher than the formula
gives, because the original hand pass took M's ink as 0.724em where the font
measures 0.714em at wght 500. The shipped value is the more conservative of the
two (more clearance under the bar), so it stays.

Letters come from `src/tables.ts`, so the script can never calibrate a letter
the renderer does not actually draw.
"""

from __future__ import annotations

import argparse
import importlib.util
import io
import re
import sys
import zipfile
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

PKG = Path(__file__).resolve().parent.parent

# The weight `.sl-wrap` actually paints at. Letters and their advances both grow
# with weight, so every measurement here has to be taken at the painted weight,
# not the font's 400 default — that is what makes --sl-matp-dot 69.2% and not
# something a wght-400 reading would suggest.
WEIGHT = 500

# Mark geometry the CSS holds fixed; the derived values are stated in terms of
# these, so a change here is a change to the whole calibration.
DOT_H = 0.15  # a taar/mandra dot's own height, em
DOT_CLEARANCE = 0.075  # gap between the tallest letter ink and the dot, em
BAR_GAP = 0.028  # gap between Ma's ink and the tivra bar above it, em
DOT_OVER_BAR = 0.06  # gap between the tivra bar and the dot line, em
# The bar's height, mirroring --sl-tivra-h in index.css. Anything unlisted uses
# the file's 0.26em default.
TIVRA_H = {"bengali": 0.2}
# Ma — the ONE letter that takes a tivra bar. Its own ink is what the bar sits
# on, so the dot line has to clear the BAR, not just the letters.
MA = {
    "gurmukhi": 0x0A2E, "devanagari": 0x092E, "bengali": 0x09AE,
    "gujarati": 0x0AAE, "latin": ord("M"),
}

# Which Noto face each script's letters come from.
FACE = {
    "gurmukhi": "gurmukhi",
    "devanagari": "devanagari",
    "bengali": "bengali",
    "gujarati": "gujarati",
    "latin": "latin",
}

# Pre-base vowel signs — rendered LEFT of their consonant, so the consonant
# lands in the right half of the cluster. Mirrors PREBASE_MATRA in src/index.ts;
# keep the two in step.
PREBASE = {
    0x093F, 0x09BF, 0x09C7, 0x09C8, 0x0A3F, 0x0ABF, 0x0B47,
    0x0BC6, 0x0BC7, 0x0BC8, 0x0DD9,
}


def load_build_fonts():
    """Reuse build-fonts.py's pinned NOTO releases and its zip loader, so the
    calibration can never be derived from a different release than the fonts."""
    path = PKG / "scripts" / "build-fonts.py"
    spec = importlib.util.spec_from_file_location("build_fonts", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def letters_from_tables() -> dict[str, dict[str, str]]:
    """The seven sargam letter strings per script, read out of src/tables.ts."""
    src = (PKG / "src" / "tables.ts").read_text(encoding="utf-8")
    body = src.split("letters: {", 1)[1]
    out: dict[str, dict[str, str]] = {}
    for m in re.finditer(r"^    (\w+): \{$", body, re.M):
        name = m.group(1)
        block = body[m.end(): body.index("},", m.end())]
        pairs = dict(re.findall(r"(\w): '([^']+)'", block))
        if len(pairs) == 7:
            out[name] = pairs
        if name == "latin":
            break
    return out


def ink_top(font: TTFont, text: str) -> float:
    """Highest ink of any glyph in `text`, in em."""
    upem = font["head"].unitsPerEm
    cmap, gs = font.getBestCmap(), font.getGlyphSet()
    top = 0.0
    for ch in text:
        name = cmap.get(ord(ch))
        if not name:
            continue
        pen = BoundsPen(gs)
        gs[name].draw(pen)
        if pen.bounds:
            top = max(top, pen.bounds[3])
    return top / upem


def advances(font: TTFont, text: str) -> list[int]:
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    return [hmtx[cmap[ord(c)]][0] for c in text if cmap.get(ord(c))]


def calibrate(font: TTFont, letters: dict[str, str], script: str) -> dict[str, float]:
    upem = font["head"].unitsPerEm
    hhea = font["hhea"]
    asc, desc = hhea.ascender / upem, abs(hhea.descender / upem)

    # The baseline's position inside a 1em box at line-height 1: the browser
    # centres (ascent + descent) on the box and puts the baseline `ascent` down
    # from the box top. Reproduces the four hand-probed values in index.css
    # (0.744/0.744/0.755/0.888 against 0.74/0.74/0.75/0.885).
    baseline = (1 - (asc + desc)) / 2 + asc

    # ONE dot line per script, high enough to satisfy BOTH constraints:
    #
    #   a) it clears the script's tallest SARGAM ink (not the tallest ink in the
    #      block — hence letters from tables.ts) so the dots read as a line;
    #   b) it clears the TIVRA BAR, which sits above Ma.
    #
    # In the Indic scripts (a) wins comfortably: Re and Ni tower over Ma, so the
    # bar fits in the gap for free. Latin is the case that needs (b) — M is both
    # its tivra letter and its tallest, so a line set from the letters alone
    # (-0.061em) puts the bar straight through the letter. Taking the minimum is
    # what makes one formula cover both instead of a hand-set exception.
    tallest = max(ink_top(font, s) for s in letters.values())
    by_letter = (baseline - tallest) - DOT_CLEARANCE - DOT_H
    bar_h = TIVRA_H.get(script, 0.26)
    ma_ink = ink_top(font, chr(MA[script])) if script in MA else 0.0
    by_bar = (baseline - ma_ink) - BAR_GAP - bar_h - DOT_OVER_BAR - DOT_H
    dot_a_top = min(by_letter, by_bar)

    out = {
        "baseline": baseline,
        "tallest": tallest,
        "dot_a_top": dot_a_top,
        "by_letter": by_letter,
        "by_bar": by_bar,
    }

    # Ni is the one sargam letter written consonant + spacing matra, so its
    # octave dot and komal underline mark the CONSONANT, not the pair.
    ni = letters["n"]
    if len(ni) > 1:
        adv = advances(font, ni)
        if len(adv) == len(ni) and sum(adv):
            out["mat_dot"] = (adv[0] / 2) / sum(adv) * 100

    # Re, where its matra is pre-base (Bengali/Assamese রে, Odia ରେ): the matra
    # is reordered ahead of the consonant, so the consonant sits right of centre.
    re_ = letters["r"]
    if len(re_) > 1 and any(ord(c) in PREBASE for c in re_):
        adv = advances(font, re_)
        if len(adv) == len(re_) and sum(adv):
            matra = sum(a for c, a in zip(re_, adv) if ord(c) in PREBASE)
            cons = sum(a for c, a in zip(re_, adv) if ord(c) not in PREBASE)
            out["matp_dot"] = (matra + cons / 2) / (matra + cons) * 100

    return out


def css_values() -> dict[str, dict[str, float]]:
    """The values currently in src/index.css, per script selector."""
    css = (PKG / "src" / "index.css").read_text(encoding="utf-8")
    keys = {
        "--sl-baseline": "baseline",
        "--sl-dot-a-top": "dot_a_top",
        "--sl-mat-dot": "mat_dot",
        "--sl-matp-dot": "matp_dot",
    }
    out: dict[str, dict[str, float]] = {}
    # A block may carry several selectors (`.sl-bengali, .sl-assamese`); record
    # the values under each, so a paired script is checked too.
    blocks = re.finditer(r"((?:^\.sl-[\w-]+,\s*\n?)*^\.sl-[\w-]+)\s*\{(.*?)\n\}", css, re.M | re.S)
    for m in blocks:
        names = re.findall(r"\.sl-([\w-]+)", m.group(1))
        vals = {}
        for prop, key in keys.items():
            v = re.search(re.escape(prop) + r":\s*(-?[\d.]+)(em|%)", m.group(2))
            if v:
                vals[key] = float(v.group(1))
        if vals:
            for n in names:
                out[n] = vals
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="diff CSS against fonts")
    ap.add_argument("--scripts", default=",".join(FACE))
    ap.add_argument(
        "--tol",
        type=float,
        default=0.015,
        help="allowed drift (em for lengths, %% for the dot splits)",
    )
    args = ap.parse_args()

    bf = load_build_fonts()
    tables = letters_from_tables()
    cache = PKG / ".noto-cache"
    current = css_values() if args.check else {}

    results, drift = {}, []
    for script in args.scripts.split(","):
        face = FACE.get(script)
        if not face or script not in tables:
            print(f"  skip {script}: no face or no letter table", file=sys.stderr)
            continue
        _, fam, _ = bf.NOTO[face]
        font = instantiateVariableFont(
            bf.load_variable(bf.fetch(cache, face), fam, "full"),
            {"wght": WEIGHT},
            inplace=False,
            updateFontNames=False,
        )
        results[script] = calibrate(font, tables[script], script)

    label = {
        "baseline": "--sl-baseline",
        "dot_a_top": "--sl-dot-a-top",
        "mat_dot": "--sl-mat-dot",
        "matp_dot": "--sl-matp-dot",
    }
    for script, r in results.items():
        unit = lambda k: "%" if k.endswith("_dot") and k != "dot_a_top" else "em"
        if args.check:
            have = current.get(script, {})
            print(f".sl-{script}")
            for key in ("baseline", "dot_a_top", "mat_dot", "matp_dot"):
                if key not in r:
                    continue
                want = r[key]
                got = have.get(key)
                if got is None:
                    print(f"    {label[key]:<16} font {want:+.3f}{unit(key)}   CSS —  MISSING")
                    drift.append((script, key, "missing"))
                    continue
                d = abs(want - got)
                ok = d <= (args.tol if unit(key) == "em" else args.tol * 100)
                print(
                    f"    {label[key]:<16} font {want:+.3f}{unit(key)}   "
                    f"CSS {got:+.3f}{unit(key)}   Δ{d:.3f}  {'ok' if ok else 'DRIFT'}"
                )
                if not ok:
                    drift.append((script, key, f"{d:.3f}"))
        else:
            print(f".sl-{script} {{")
            print(
                f"  /* tallest sargam ink {r['tallest']:.3f}em at wght {WEIGHT}; "
                f"dot line by letters {r['by_letter']:+.3f}, by tivra bar "
                f"{r['by_bar']:+.3f} — the lower governs */"
            )
            print(f"  --sl-dot-a-top: {r['dot_a_top']:.3f}em;")
            print(f"  --sl-baseline: {r['baseline']:.3f}em;")
            if "mat_dot" in r:
                print(f"  --sl-mat-dot: {r['mat_dot']:.1f}%;")
            if "matp_dot" in r:
                print(f"  --sl-matp-dot: {r['matp_dot']:.1f}%;")
            print("}")

    if args.check and drift:
        print(f"\n{len(drift)} value(s) drifted beyond {args.tol}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
