import { useLocalStorage } from '@vueuse/core';
import type { SwarlipiScript, SwarlipiScriptInput } from 'swarlipi';

/**
 * Display settings shared by every live sample on the site, so one set of
 * controls drives them all — the script picked on the home playground is the
 * script the symbols sheet, the specimen and the font page show.
 *
 * `useLocalStorage` rather than plain refs plus a hand-rolled read/write pair:
 * it keeps the choice across a reload, returns the default during the
 * prerender instead of touching a `localStorage` that is not there, swallows a
 * storage that throws (a browser set to block site data), and syncs open tabs
 * through the `storage` event for free.
 */
export const SCRIPTS: { id: SwarlipiScript; label: string }[] = [
  { id: 'gurmukhi', label: 'Gurmukhi' },
  { id: 'devanagari', label: 'Devanagari' },
  { id: 'bengali', label: 'Bengali' },
  { id: 'gujarati', label: 'Gujarati' },
  { id: 'latin', label: 'Latin' },
];

export const lang = useLocalStorage<SwarlipiScriptInput>(
  'swarlipi-lang',
  'gurmukhi'
);
export const sizePx = useLocalStorage('swarlipi-size', 40);
export const bold = useLocalStorage('swarlipi-bold', false);
export const editing = useLocalStorage('swarlipi-editing', false);

// Stored values are not typed at runtime, and `lang` is the one that reaches
// the renderer as a class name and a lookup key. Fall back rather than render
// an `sl-` class no stylesheet has.
// A returning visitor's stored value may be an original language id, which the
// renderer still accepts but which matches no row here — map it forward so the
// script switch shows the right selection instead of resetting it.
const LEGACY_IDS: Record<string, SwarlipiScript> = {
  punjabi: 'gurmukhi',
  hindi: 'devanagari',
  bangla: 'bengali',
  english: 'latin',
};
if (LEGACY_IDS[lang.value]) lang.value = LEGACY_IDS[lang.value]!;
if (!SCRIPTS.some((s) => s.id === lang.value)) lang.value = 'gurmukhi';
