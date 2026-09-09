// The letter, bol and digit tables per script. A module rather than JSON so
// the built package imports it the same way in bundlers and in Node.
//
// Keyed by SCRIPT — the letterform set — not by language, because several
// languages share one set: Marathi, Nepali and Konkani notation is `devanagari`,
// the very same letters Hindi uses, so they belong in a host app's language
// list mapped onto a script rather than duplicated here.
const tables = {
  letters: {
    gurmukhi: {
      s: 'ਸ',
      r: 'ਰੇ',
      g: 'ਗ',
      m: 'ਮ',
      p: 'ਪ',
      d: 'ਧ',
      n: 'ਨੀ',
    },
    devanagari: {
      s: 'स',
      r: 'रे',
      g: 'ग',
      m: 'म',
      p: 'प',
      d: 'ध',
      n: 'नी',
    },
    bengali: {
      s: 'স',
      r: 'রে',
      g: 'গ',
      m: 'ম',
      p: 'প',
      d: 'ধ',
      n: 'নী',
    },
    gujarati: {
      s: 'સ',
      r: 'રે',
      g: 'ગ',
      m: 'મ',
      p: 'પ',
      d: 'ધ',
      n: 'ની',
    },
    latin: {
      s: 'S',
      r: 'R',
      g: 'G',
      m: 'M',
      p: 'P',
      d: 'D',
      n: 'N',
    },
  },
  bols: {
    gurmukhi: {
      ';': 'ਦ',
      "'": 'ਰ',
      '[': 'ਦਾ',
      ']': 'ਰਾ',
      '\\': 'ਦਿਰ',
    },
    devanagari: {
      ';': 'द',
      "'": 'र',
      '[': 'दा',
      ']': 'रा',
      '\\': 'दिर',
    },
    bengali: {
      ';': 'দ',
      "'": 'র',
      '[': 'দা',
      ']': 'রা',
      '\\': 'দির',
    },
    gujarati: {
      ';': 'દ',
      "'": 'ર',
      '[': 'દા',
      ']': 'રા',
      '\\': 'દિર',
    },
    latin: {
      ';': 'da',
      "'": 'ra',
      '[': 'daa',
      ']': 'raa',
      '\\': 'dir',
    },
  },
  digits: {
    gurmukhi: '੦੧੨੩੪੫੬੭੮੯',
    devanagari: '०१२३४५६७८९',
    bengali: '০১২৩৪৫৬৭৮৯',
    gujarati: '૦૧૨૩૪૫૬૭૮૯',
    latin: '0123456789',
  },
  text: {
    '-': '–',
    _: '—',
  },
};

export default tables;
