/**
 * The symbol reference: every input character, what it means, and a beat that
 * shows it. One source for the docs' mapping table and for the notation app's
 * in-editor guide sheet, so the two cannot drift.
 */

export interface SymbolEntry {
  /** What the writer types. */
  key: string;
  /** What it means, in Bhatkhande terms. */
  name: string;
  /** A beat that shows it, in the input grammar. */
  example: string;
}

export interface SymbolGroup {
  /** Stable id a document refers to (`{{symbols:<id>}}` in the app's guide). */
  id: string;
  title: string;
  entries: SymbolEntry[];
}

export const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    id: 'swaras',
    title: 'Swaras',
    entries: [
      { key: 's', name: 'Sa', example: 's' },
      { key: 'r', name: 'Re', example: 'r' },
      { key: 'g', name: 'Ga', example: 'g' },
      { key: 'm', name: 'Ma', example: 'm' },
      { key: 'p', name: 'Pa', example: 'p' },
      { key: 'd', name: 'Dha', example: 'd' },
      { key: 'n', name: 'Ni', example: 'n' },
    ],
  },
  {
    id: 'variants',
    title: 'Komal and tivra',
    entries: [
      { key: 'R', name: 'komal (flat) Re', example: 'R' },
      { key: 'G', name: 'komal (flat) Ga', example: 'G' },
      { key: 'M', name: 'tivra (sharp) Ma', example: 'M' },
      { key: 'D', name: 'komal (flat) Dha', example: 'D' },
      { key: 'N', name: 'komal (flat) Ni', example: 'N' },
    ],
  },
  {
    id: 'octaves',
    title: 'Octaves',
    entries: [
      { key: 'u', name: 'taar: one dot above', example: 'su' },
      { key: 'U', name: 'ati-taar: two dots above', example: 'sU' },
      { key: 'l', name: 'mandra: one dot below', example: 'sl' },
      { key: 'L', name: 'ati-mandra: two dots below', example: 'sL' },
    ],
  },
  {
    id: 'strokes',
    title: 'Mizrab ke bol (strokes)',
    entries: [
      { key: ';', name: 'Da', example: ';' },
      { key: "'", name: 'Ra', example: "'" },
      { key: '[', name: 'Daa', example: '[' },
      { key: ']', name: 'Raa', example: ']' },
      { key: '\\', name: 'Dir', example: '\\' },
    ],
  },
  {
    id: 'chhand',
    title: 'Chhand',
    entries: [
      { key: '@', name: 'Dugun (2)', example: '@sr' },
      { key: '#', name: 'Tigun (3)', example: '#srg' },
      { key: '$', name: 'Chaugun (4)', example: '$srgm' },
      { key: '%', name: 'Pachgun (5)', example: '%srgmp' },
      { key: '^', name: 'Chhatgun (6)', example: '^srgmpd' },
      { key: '&', name: 'Satgun (7)', example: '&srgmpdn' },
      { key: '*', name: 'Athgun (8)', example: '*srgmpdns' },
    ],
  },
  {
    id: 'chhand-lower',
    title: 'Lower chhand (for nesting)',
    entries: [
      { key: '`', name: 'Lower chaugun (4)', example: '`srgm' },
      { key: '!', name: 'Lower chhatgun (6)', example: '!srgmpd' },
      { key: '~', name: 'Lower athgun (8)', example: '~srgmpdns' },
    ],
  },
  {
    id: 'meend',
    title: 'Meend and ghaseet',
    entries: [
      { key: 'q', name: 'Meend start', example: 'qsre' },
      { key: 'e', name: 'Meend end', example: 'qsre' },
      { key: 'w', name: 'Meend continue (an in-between beat)', example: 'w' },
      {
        key: 'W',
        name: 'Meend stroke (a note struck again)',
        example: 'qsWrem',
      },
      { key: 'Q', name: 'Ghaseet start', example: 'QsrE' },
      { key: 'E', name: 'Ghaseet end', example: 'QsrE' },
    ],
  },
  {
    id: 'kan',
    title: 'Kan (grace note)',
    entries: [
      { key: '{ }', name: 'Kan before the note', example: '{m}p' },
      { key: '{ }', name: 'Two-note kan', example: '{pd}n' },
    ],
  },
  {
    id: 'krintan',
    title: 'Krintan',
    entries: [
      { key: '{m3}', name: 'Kan struck three times', example: '{m3}p' },
      { key: '{g2}', name: 'Kan struck twice', example: '{g2}r' },
    ],
  },
  {
    id: 'murki',
    title: 'Murki',
    entries: [{ key: '( )', name: 'Murki around the note', example: '(p)' }],
  },
  {
    id: 'misc',
    title: 'Dashes, digits and separators',
    entries: [
      {
        key: '-',
        name: 'Sustain (khali): holds the previous note',
        example: 's-',
      },
      { key: '_', name: 'Long dash', example: '_' },
      { key: ',', name: 'Comma', example: 's,r' },
      { key: 'space', name: 'Separates notes within a beat', example: 's r g' },
      {
        key: '0–9',
        name: 'Digits, in the script’s numerals',
        example: '0123456789',
      },
    ],
  },
];
