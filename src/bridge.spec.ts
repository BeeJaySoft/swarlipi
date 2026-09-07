import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MEEND_BAR_RATIO } from './index';
import {
  BRIDGE_OVERLAP,
  bridgeClass,
  bridgeMarkup,
  bridgeStyle,
  type BridgeBar,
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
