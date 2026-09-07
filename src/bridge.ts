/**
 * Cross-beat bridging for swarlipi's meend / ghaseet fragments.
 *
 * The renderer draws one beat at a time: an opening hook where a glide leaves
 * a note, a bar through a beat it passes, a closing hook where it arrives.
 * Each fragment is a real element — a `.sl-mz` mark zone or a `.sl-mbr`
 * bracket — so joining them is element-anchored: consecutive zones along a
 * span are bridged pair by pair at the fragment-bar height. This module
 * measures those bridges; the host owns the beat cells, the spans (which
 * beats pair — see `@np/notation/meend` for the notation app's rules) and
 * when to re-measure.
 *
 * Two geometries per bar, on purpose:
 *  - The measured one: x endpoints decomposed as beat-cell-center % + a
 *    font-fixed px remainder, top/height as container px. Screen-exact, and
 *    the only geometry on engines without CSS anchor positioning.
 *  - The anchored one: every zone in a chain gets an inline `anchor-name`,
 *    and the `[data-sl-bar]` rules in `swarlipi/style.css` pin each bar to its zones
 *    with `anchor()`. The browser re-derives it on EVERY layout pass — which
 *    is what survives print, where the page re-lays-out at paper width with
 *    print-media font sizes no screen measurement can predict, and no JS
 *    runs. Those rules are `!important` so they beat the measured inline
 *    fallback wherever anchors are supported.
 *
 * Anchor names are written as inline styles onto rendered output, so any
 * re-render of a beat drops them; re-measure whenever zone elements are added.
 */

import { MEEND_BAR_RATIO } from './meend-metrics';

/** A glide from the beat at flat index `from` to the beat at `to`. */
export interface BridgeSpan {
  from: number;
  to: number;
}

export interface BridgeBar {
  /** Measured fallback: left edge as container-width % + px. */
  leftPct: number;
  leftPx: number;
  /** Measured fallback: width as container-width % + px. */
  widthPct: number;
  widthPx: number;
  /** Measured fallback: top and height in container px. */
  top: number;
  height: number;
  /** anchor-name of the zone the top/thickness derive from. */
  topAnchor: string;
  /** anchor-name of the start zone (bar runs from its right edge), or null
      when the bar starts at the container edge (row-wrap second piece). */
  startAnchor: string | null;
  /** anchor-name of the end zone (bar runs to its left edge), or null when
      the bar ends at the container edge (row-wrap first piece). */
  endAnchor: string | null;
  /** Ink height as a fraction of the box, drawn by the bar's own svg rect. */
  slabRatio: number;
}

export interface MeasureBridgesOptions {
  /** The positioned element the bars are absolutely placed in. Zones must be
      its descendants, so they are valid CSS anchors for the bars. */
  container: HTMLElement;
  /** The beat cell for a flat beat index, or nothing when it is not in the
      DOM. Zones are looked up inside it; the measured x is decomposed against
      its center. */
  cellAt: (beatIndex: number) => Element | null | undefined;
  spans: ReadonlyArray<BridgeSpan>;
  /** Dashed-ident prefix for the anchor names written onto the zones
      (`--x` form). Must be unique per container on the page. */
  anchorPrefix: string;
}

/** Selector for the fragment elements a bridge joins. */
export const BRIDGE_ZONE_SELECTOR = '.sl-mz, .sl-mbr';

/** Both ends run this many zone-heights INTO their zones: the piece bars end
    in chamfered path corners, and a bar that merely touches them prints as a
    dashed seam at every junction. The stylesheet's `--sl-bar-overlap` mirrors
    it for the anchor rules (a test fails if the two drift). */
export const BRIDGE_OVERLAP = 0.35;

// Ink height as a fraction of the zone's box — SCALE-FREE on purpose. The
// anchor rules re-derive the box at print layout with no JS, so a ratio
// measured in screen pixels would be re-applied to a differently sized box
// and print the connector at the wrong weight.
//
// A mark zone's bar is MEEND_BAR_RATIO of its frame, straight from the
// renderer. A ghaseet's is its bracket's border over its own box, computed
// from the same em variables the stylesheet uses rather than from the
// rendered border width — the browser floors that to a whole device pixel,
// which is precisely the screen-only number that must not be baked in.
function slabRatioOf(zone: HTMLElement): number {
  if (zone.classList.contains('sl-mz')) return MEEND_BAR_RATIO;
  const css = getComputedStyle(zone);
  const em = (name: string) =>
    Number.parseFloat(css.getPropertyValue(name)) || 0;
  const bar = em('--sl-mz-h') * em('--sl-bar-ratio');
  const box = em('--sl-mbr-leg') + bar;
  return box > 0 ? bar / box : MEEND_BAR_RATIO;
}

interface Zone {
  el: HTMLElement;
  cell: Element;
  /** This zone's CSS anchor-name (assigned inline on the element). */
  name: string;
}

interface XAnchor {
  pct: number;
  px: number;
}

export function measureBridges({
  container,
  cellAt,
  spans,
  anchorPrefix,
}: MeasureBridgesOptions): BridgeBar[] {
  const bars: BridgeBar[] = [];
  const containerRect = container.getBoundingClientRect();

  const zonesOf = (beatIndex: number): Zone[] => {
    const cell = cellAt(beatIndex);
    if (!cell) return [];
    return [...cell.querySelectorAll<HTMLElement>(BRIDGE_ZONE_SELECTOR)].map(
      (el, zi) => {
        const name = `${anchorPrefix}-${beatIndex}-${zi}`;
        el.style.setProperty('anchor-name', name);
        return { el, cell, name };
      }
    );
  };

  // Decompose an x coordinate against the zone's beat cell: center as a
  // container-width percentage + a font-fixed px remainder.
  const anchorOf = (zone: Zone, x: number): XAnchor => {
    const cellRect = zone.cell.getBoundingClientRect();
    const center = cellRect.left + cellRect.width / 2;
    return {
      pct: ((center - containerRect.left) / containerRect.width) * 100,
      px: x - center,
    };
  };

  // The bar's BOX is the full mark zone, and the band is drawn inside it by
  // the svg's rect at `slabRatio` of that box — the same arithmetic the
  // fragment path uses. Sizing the box itself to the band instead made the
  // browser round the two differently: the bridge came out ~0.25 device px
  // thinner than the piece bars, so the `w` read as bleeding at every
  // junction.
  const pushBar = (
    from: XAnchor,
    to: XAnchor,
    top: number,
    topZone: Zone,
    startZone: Zone | null,
    endZone: Zone | null
  ) => {
    const zoneH = topZone.el.getBoundingClientRect().height;
    const overlap = zoneH * BRIDGE_OVERLAP;
    const fromPx = from.px - (startZone ? overlap : 0);
    const toPx = to.px + (endZone ? overlap : 0);
    bars.push({
      leftPct: from.pct,
      leftPx: fromPx,
      widthPct: to.pct - from.pct,
      widthPx: toPx - fromPx,
      top,
      height: zoneH,
      topAnchor: topZone.name,
      startAnchor: startZone?.name ?? null,
      endAnchor: endZone?.name ?? null,
      slabRatio: slabRatioOf(topZone.el),
    });
  };

  for (const span of spans) {
    if (span.to <= span.from) continue; // in-beat pairs draw themselves

    // Anchor chain: the opener beat's LAST zone (its opener piece trails the
    // beat), every intermediate beat's zones in order, the closer beat's
    // FIRST zone (its closer piece leads the beat). Bridging consecutive
    // pairs handles any number of row wraps.
    const chain: Zone[] = [];
    const fromZones = zonesOf(span.from);
    if (fromZones.length) chain.push(fromZones[fromZones.length - 1]!);
    for (let m = span.from + 1; m < span.to; m++) chain.push(...zonesOf(m));
    const toZones = zonesOf(span.to);
    if (toZones.length) chain.push(toZones[0]!);
    if (chain.length < 2) continue;

    for (let k = 0; k < chain.length - 1; k++) {
      const za = chain[k]!;
      const zb = chain[k + 1]!;
      const a = za.el.getBoundingClientRect();
      const b = zb.el.getBoundingClientRect();
      const start = anchorOf(za, a.right);
      const end = anchorOf(zb, b.left);
      // Row test against the line advance, not the mark height: anything
      // under half a line apart is the same row.
      const sameRow = Math.abs(a.top - b.top) < a.height * 2;
      if (sameRow) {
        pushBar(start, end, a.top - containerRect.top, za, za, zb);
      } else {
        pushBar(
          start,
          { pct: 100, px: 0 },
          a.top - containerRect.top,
          za,
          za,
          null
        );
        pushBar(
          { pct: 0, px: 0 },
          end,
          b.top - containerRect.top,
          zb,
          null,
          zb
        );
      }
    }
  }
  return bars;
}

/** Class list for a bar element, beside the `data-sl-bar` attribute:
    `sl-bar-a` when it starts at a zone, `sl-bar-b` when it ends at one. */
export function bridgeClass(bar: BridgeBar): string {
  const classes: string[] = [];
  if (bar.startAnchor) classes.push('sl-bar-a');
  if (bar.endAnchor) classes.push('sl-bar-b');
  return classes.join(' ');
}

/** Inline style for a bar element: the measured fallback geometry plus the
    anchor names the `[data-sl-bar]` rules read. */
export function bridgeStyle(bar: BridgeBar): Record<string, string> {
  const style: Record<string, string> = {
    left: `calc(${bar.leftPct}% + ${bar.leftPx}px)`,
    width: `calc(${bar.widthPct}% + ${bar.widthPx}px)`,
    top: `${bar.top}px`,
    height: `${bar.height}px`,
    '--sl-t': bar.topAnchor,
  };
  if (bar.startAnchor) style['--sl-a'] = bar.startAnchor;
  if (bar.endAnchor) style['--sl-b'] = bar.endAnchor;
  return style;
}

/** The bar's ink: an svg filling the box, with the band drawn as a rect at
    `slabRatio` of it. SVG fill rather than a background so it prints. */
export function bridgeMarkup(bar: BridgeBar): string {
  return (
    `<svg viewBox="0 0 1 1" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">` +
    `<rect x="0" y="0" width="1" height="${bar.slabRatio}" fill="currentColor"/>` +
    `</svg>`
  );
}

/** A ready bar element for hosts without a template layer. Append it to the
    container the bars were measured in. */
export function bridgeElement(
  bar: BridgeBar,
  doc: Document = document
): HTMLElement {
  const el = doc.createElement('div');
  el.setAttribute('data-sl-bar', '');
  el.className = bridgeClass(bar);
  for (const [prop, value] of Object.entries(bridgeStyle(bar))) {
    el.style.setProperty(prop, value);
  }
  el.innerHTML = bridgeMarkup(bar);
  return el;
}
