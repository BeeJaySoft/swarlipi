import { ref } from 'vue';
import type { SwarlipiScript } from 'swarlipi';

/**
 * Display settings shared by every live sample on a page, so one set of
 * controls (SheetControls) drives them all.
 */
export const SCRIPTS: { id: SwarlipiScript; label: string }[] = [
  { id: 'punjabi', label: 'Gurmukhi' },
  { id: 'hindi', label: 'Devanagari' },
  { id: 'bangla', label: 'Bengali' },
  { id: 'english', label: 'Latin' },
];

export const lang = ref<SwarlipiScript>('punjabi');
export const sizePx = ref(28);
export const bold = ref(false);
export const editing = ref(false);
