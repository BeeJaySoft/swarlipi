import { useLocalStorage } from '@vueuse/core';
import type { SwarlipiScript } from 'swarlipi';

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
  { id: 'punjabi', label: 'Gurmukhi' },
  { id: 'hindi', label: 'Devanagari' },
  { id: 'bangla', label: 'Bengali' },
  { id: 'english', label: 'Latin' },
];

export const lang = useLocalStorage<SwarlipiScript>('swarlipi-lang', 'punjabi');
export const sizePx = useLocalStorage('swarlipi-size', 40);
export const bold = useLocalStorage('swarlipi-bold', false);
export const editing = useLocalStorage('swarlipi-editing', false);

// Stored values are not typed at runtime, and `lang` is the one that reaches
// the renderer as a class name and a lookup key. Fall back rather than render
// an `sl-` class no stylesheet has.
if (!SCRIPTS.some((s) => s.id === lang.value)) lang.value = 'punjabi';
