/**
 * The meend fragment's vertical geometry, kept as a leaf module so
 * `swarlipi/bridge` can take the bar ratio without loading the renderer.
 */

/** Shared vertical frame for all three outlines (q/e hooks, w bar). */
export const MK_FRAME_UNITS = 12;

/**
 * Bar band: the top 4.5 of the frame. The hooks' inner edges leave their join
 * at the same 4.5 so the stroke keeps one weight from curl to curl.
 */
export const MK_BAR_UNITS = 4.5;

/**
 * Fraction of a mark zone's height taken by the glide's bar — the single
 * source for the stroke weight. Consumed by the W path, by the stylesheet's
 * `--sl-bar-ratio` (guarded by a test in index.spec.ts), and by the
 * cross-beat bridge slab, so a fragment bar and the bridge continuing it can
 * never disagree on thickness.
 */
export const MEEND_BAR_RATIO = MK_BAR_UNITS / MK_FRAME_UNITS;
