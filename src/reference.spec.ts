import { describe, expect, it } from 'vitest';
import { renderSwarlipi, toUnicodeNotation } from './index';
import { SYMBOL_GROUPS } from './reference';

describe('symbol reference', () => {
  it('has unique group ids, for the documents that refer to them', () => {
    const ids = SYMBOL_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders every example in every script, with no raw key leaking through', () => {
    for (const group of SYMBOL_GROUPS) {
      for (const { example } of group.entries) {
        for (const lang of ['punjabi', 'hindi', 'bangla', 'english'] as const) {
          const html = renderSwarlipi(example, lang);
          expect(html, `${group.id}: ${example} (${lang})`).not.toBe('');
          // Markers and modifiers must have been consumed: none of the
          // grammar's letters may survive as visible text in an Indic script.
          const text = html.replace(/<[^>]+>/g, '');
          if (lang !== 'english')
            expect(text, `${group.id}: ${example} (${lang})`).not.toMatch(
              /[srgmpdnRGMDNulUL@#$%^&*`!~qweWQE{}]/
            );
        }
      }
    }
  });

  it('has a plain-text form for every example', () => {
    for (const group of SYMBOL_GROUPS)
      for (const { example } of group.entries)
        expect(typeof toUnicodeNotation(example, 'hindi')).toBe('string');
  });
});
