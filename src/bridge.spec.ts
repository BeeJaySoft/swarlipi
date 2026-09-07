import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MEEND_BAR_RATIO } from './meend-metrics';
import {
  BRIDGE_OVERLAP,
  bridgeClass,
  bridgeMarkup,
  bridgeStyle,
  planBridges,
  type BridgeBar,
  type BridgeRect,
  type BridgeSpan,
  type BridgeZone,
} from './bridge';

const bar = (over: Partial<BridgeBar> = {}): BridgeBar => ({
  leftPct: 12.5,
  leftPx: -3,
  widthPct: 25,
  widthPx: 6,
  top: 40,
  height: 8,
  topAnchor: '--ssb-1-0-2-0',
  startAnchor: '--ssb-1-0-2-0',
  endAnchor: '--ssb-1-0-3-0',
  slabRatio: MEEND_BAR_RATIO,
  ...over,
});

describe('bridgeClass', () => {
  it('marks which ends are zone-pinned', () => {
    expect(bridgeClass(bar())).toBe('sl-bar-a sl-bar-b');
    expect(bridgeClass(bar({ endAnchor: null }))).toBe('sl-bar-a');
    expect(bridgeClass(bar({ startAnchor: null }))).toBe('sl-bar-b');
  });
});

describe('bridgeStyle', () => {
  it('emits the measured fallback and the anchor names the CSS reads', () => {
    expect(bridgeStyle(bar())).toEqual({
      left: 'calc(12.5% + -3px)',
      width: 'calc(25% + 6px)',
      top: '40px',
      height: '8px',
      '--sl-t': '--ssb-1-0-2-0',
      '--sl-a': '--ssb-1-0-2-0',
      '--sl-b': '--ssb-1-0-3-0',
    });
  });

  it('omits the anchor a container-edge piece does not have', () => {
    const first = bridgeStyle(bar({ endAnchor: null }));
    expect(first).not.toHaveProperty('--sl-b');
    const second = bridgeStyle(bar({ startAnchor: null }));
    expect(second).not.toHaveProperty('--sl-a');
  });
});

describe('bridgeMarkup', () => {
  it('draws the band inside a full-box svg at the slab ratio', () => {
    const svg = bridgeMarkup(bar());
    expect(svg).toContain('preserveAspectRatio="none"');
    expect(svg).toContain(`height="${MEEND_BAR_RATIO}"`);
    expect(svg).toContain('fill="currentColor"');
  });
});

describe('stylesheet contract', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf-8');
  it('pins bars with the same overlap the measurement uses', () => {
    const declared = css.match(/--sl-bar-overlap:\s*([\d.]+)\s*;/g) ?? [];
    expect(declared).toHaveLength(1);
    expect(Number(/([\d.]+)/.exec(declared[0]!)![1])).toBe(BRIDGE_OVERLAP);
  });

  it('reads the custom properties bridgeStyle sets', () => {
    const rules = css.slice(css.indexOf('[data-sl-bar]'));
    for (const prop of Object.keys(bridgeStyle(bar()))) {
      if (prop.startsWith('--')) expect(rules).toContain(`var(${prop})`);
    }
  });
});

// ---------------------------------------------------------------------------
// planBridges: the geometry, with synthetic rects instead of a layout engine.
// A DOM shim cannot stand in here — jsdom and happy-dom return a zero rect for
// every element, so the numbers these tests assert would all be 0.

/** A row of beat cells: 100px pitch, 80px wide, one 12px zone per beat. */
const ROW_Y = 40;
const CONTAINER: BridgeRect = {
  top: 0,
  left: 0,
  right: 1000,
  width: 1000,
  height: 200,
};

function beat(
  index: number,
  opts: { row?: number; zones?: number; slabRatio?: number } = {}
): BridgeZone[] {
  const { row = 0, zones = 1, slabRatio = MEEND_BAR_RATIO } = opts;
  const cellLeft = index * 100;
  const cellRect: BridgeRect = {
    left: cellLeft,
    right: cellLeft + 80,
    width: 80,
    top: ROW_Y + row * 80,
    height: 30,
  };
  return Array.from({ length: zones }, (_, zi) => ({
    name: `--z-${index}-${zi}`,
    // zones sit side by side inside the cell
    rect: {
      left: cellLeft + 10 + zi * 30,
      right: cellLeft + 10 + zi * 30 + 20,
      width: 20,
      top: cellRect.top,
      height: 12,
    },
    cellRect,
    slabRatio,
  }));
}

const plan = (
  spans: BridgeSpan[],
  beats: Record<number, BridgeZone[]>
): BridgeBar[] =>
  planBridges({
    containerRect: CONTAINER,
    zonesAt: (i) => beats[i],
    spans,
  });

describe('planBridges', () => {
  const twoBeats: Record<number, BridgeZone[]> = { 0: beat(0), 1: beat(1) };

  it('bridges one gap between adjacent beats, pinned to both zones', () => {
    const bars = plan([{ from: 0, to: 1 }], twoBeats);
    expect(bars).toHaveLength(1);
    const [bar] = bars;
    expect(bar!.startAnchor).toBe('--z-0-0');
    expect(bar!.endAnchor).toBe('--z-1-0');
    expect(bar!.topAnchor).toBe('--z-0-0');
    expect(bar!.height).toBe(12);
    expect(bar!.top).toBe(ROW_Y);
    expect(bar!.slabRatio).toBe(MEEND_BAR_RATIO);
  });

  it('runs both ends BRIDGE_OVERLAP zone-heights into their zones', () => {
    const [bar] = plan([{ from: 0, to: 1 }], twoBeats);
    const overlap = 12 * BRIDGE_OVERLAP;
    // cell 0 centre is 40, the zone's right edge 30 → -10 before the overlap
    expect(bar!.leftPx).toBeCloseTo(-10 - overlap, 6);
    // the bar must be WIDER than the plain gap by one overlap at each end
    const plainWidth = 110 - 30; // zone1.left - zone0.right
    const spanPct = bar!.widthPct * (CONTAINER.width / 100);
    expect(spanPct + bar!.widthPx).toBeCloseTo(plainWidth + 2 * overlap, 6);
  });

  it('decomposes x as cell-centre percent plus a font-fixed remainder', () => {
    const [bar] = plan([{ from: 0, to: 1 }], twoBeats);
    // centres at 40 and 140 of a 1000px container
    expect(bar!.leftPct).toBeCloseTo(4, 6);
    expect(bar!.leftPct + bar!.widthPct).toBeCloseTo(14, 6);
  });

  it('chains through the intermediate beats a glide passes', () => {
    const bars = plan([{ from: 0, to: 3 }], {
      0: beat(0),
      1: beat(1),
      2: beat(2),
      3: beat(3),
    });
    expect(bars).toHaveLength(3);
    expect(bars.map((b) => [b.startAnchor, b.endAnchor])).toEqual([
      ['--z-0-0', '--z-1-0'],
      ['--z-1-0', '--z-2-0'],
      ['--z-2-0', '--z-3-0'],
    ]);
  });

  it('takes the opener beat LAST zone and the closer beat FIRST zone', () => {
    // a beat that closes one glide and opens the next carries two zones
    const bars = plan([{ from: 0, to: 1 }], {
      0: beat(0, { zones: 2 }),
      1: beat(1, { zones: 2 }),
    });
    expect(bars).toHaveLength(1);
    expect(bars[0]!.startAnchor).toBe('--z-0-1'); // trailing piece of `from`
    expect(bars[0]!.endAnchor).toBe('--z-1-0'); // leading piece of `to`
  });

  it('splits into two edge-anchored bars when the span wraps a row', () => {
    const bars = plan([{ from: 0, to: 1 }], {
      0: beat(0),
      1: beat(1, { row: 1 }),
    });
    expect(bars).toHaveLength(2);
    const [first, second] = bars;
    // first runs from its zone to the container's right edge
    expect(first!.startAnchor).toBe('--z-0-0');
    expect(first!.endAnchor).toBeNull();
    expect(first!.leftPct + first!.widthPct).toBeCloseTo(100, 6);
    expect(first!.top).toBe(ROW_Y);
    // second starts at the left edge and ends on the next row's zone
    expect(second!.startAnchor).toBeNull();
    expect(second!.endAnchor).toBe('--z-1-0');
    expect(second!.leftPct).toBe(0);
    expect(second!.leftPx).toBe(0);
    expect(second!.top).toBe(ROW_Y + 80);
  });

  it('treats a small vertical offset as the same row, not a wrap', () => {
    // under two zone-heights apart: a taller neighbouring mark, not a new row
    const nudged = beat(1);
    nudged[0]!.rect = { ...nudged[0]!.rect, top: ROW_Y + 20 };
    expect(plan([{ from: 0, to: 1 }], { 0: beat(0), 1: nudged })).toHaveLength(
      1
    );
  });

  it('takes each bar thickness from the zone it hangs off', () => {
    // a ghaseet bracket resolves a different ratio from a meend zone
    const bars = plan([{ from: 0, to: 1 }], {
      0: beat(0, { slabRatio: 0.4359 }),
      1: beat(1),
    });
    expect(bars[0]!.slabRatio).toBeCloseTo(0.4359, 6);
  });

  it('skips in-beat pairs and reversed spans', () => {
    expect(plan([{ from: 1, to: 1 }], twoBeats)).toEqual([]);
    expect(plan([{ from: 1, to: 0 }], twoBeats)).toEqual([]);
  });

  it('bridges the fragments that ARE on the page when a span runs off the end', () => {
    // a trimmed view (the app renders a section prefix) can hold the opener and
    // some middles but not the closer: draw what is there rather than nothing
    const bars = plan([{ from: 0, to: 9 }], twoBeats);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.startAnchor).toBe('--z-0-0');
    expect(bars[0]!.endAnchor).toBe('--z-1-0');
  });

  it('draws nothing when the container has not been laid out', () => {
    // display:none, a tab not yet shown, a measure before first layout: every
    // rect reads 0. Without the guard the % divide yields NaN and `0 < 0`
    // sends every pair down the row-wrap branch, doubling the bars.
    const bars = planBridges({
      containerRect: { top: 0, left: 0, right: 0, width: 0, height: 0 },
      zonesAt: (i) => twoBeats[i],
      spans: [{ from: 0, to: 1 }],
    });
    expect(bars).toEqual([]);
  });

  it('skips a span with fewer than two fragments on the page', () => {
    expect(plan([{ from: 0, to: 1 }], { 0: beat(0) })).toEqual([]);
    expect(plan([{ from: 0, to: 1 }], {})).toEqual([]);
  });

  it('emits a bar per span when several glides share the grid', () => {
    const bars = plan(
      [
        { from: 0, to: 1 },
        { from: 2, to: 3 },
      ],
      {
        0: beat(0),
        1: beat(1),
        2: beat(2),
        3: beat(3),
      }
    );
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.startAnchor)).toEqual(['--z-0-0', '--z-2-0']);
  });
});
