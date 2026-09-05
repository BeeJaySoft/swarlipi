import { defineConfig } from 'vitepress';

// The renderer's default faces. The stylesheet does not fetch fonts; the site
// loads the four Noto families the way an integrator would.
const FONTS =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400..700&family=Noto+Sans+Devanagari:wght@400..700&family=Noto+Sans+Bengali:wght@400..700&family=Noto+Sans:wght@400..700&display=swap';

export default defineConfig({
  title: 'Swarlipi',
  description:
    'Bhatkhande notation as real Unicode text, in four scripts, with no notation font.',
  lang: 'en',
  cleanUrls: true,
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    ],
    ['link', { rel: 'stylesheet', href: FONTS }],
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Notation', link: '/notation/', activeMatch: '/notation/' },
      { text: 'Playground', link: '/playground' },
      { text: 'API', link: '/api' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Integration', link: '/guide/integration' },
            { text: 'Omenad compatibility', link: '/guide/compatibility' },
          ],
        },
      ],
      '/notation/': [
        {
          text: 'Notation',
          items: [
            { text: 'Symbol reference', link: '/notation/' },
            { text: 'Cross-beat glides', link: '/notation/cross-beat' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    footer: {
      message:
        'Released under the MIT License. Inspired by the Omenad Bhatkhande fonts.',
    },
  },
});
