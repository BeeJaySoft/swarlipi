import { defineConfig } from 'vitepress';

// The renderer's default faces. The stylesheet does not fetch fonts; the site
// loads the four Noto families the way an integrator would.
const FONTS =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400..700&family=Noto+Sans+Devanagari:wght@400..700&family=Noto+Sans+Bengali:wght@400..700&family=Noto+Sans:wght@400..700&display=swap';

// The package's own fonts, served from npm the way the page tells you to.
const SWARLIPI_FONTS =
  'https://cdn.jsdelivr.net/npm/swarlipi@0.1/fonts/swarlipi-fonts.css';

// One sidebar for the whole site. At seven pages a per-section sidebar hides
// more than it focuses: this way every page shows where else there is to go.
const DOCS_SIDEBAR = [
  {
    text: 'Guide',
    items: [
      { text: 'Getting started', link: '/guide/getting-started' },
      { text: 'Integration', link: '/guide/integration' },
    ],
  },
  {
    text: 'Notation',
    items: [
      { text: 'Symbols', link: '/notation/' },
      { text: 'What to type', link: '/notation/keymap' },
      { text: 'Cross-beat glides', link: '/notation/cross-beat' },
      { text: 'Omenad compatibility', link: '/notation/compatibility' },
    ],
  },
  { text: 'Reference', items: [{ text: 'API', link: '/api' }] },
  { text: 'Fonts', link: '/fonts/' },
];

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
    // The Swarlipi faces themselves, for the specimen on /fonts/.
    ['link', { rel: 'stylesheet', href: SWARLIPI_FONTS }],
  ],
  themeConfig: {
    // General → showcase → download, with the download in the CTA slot
    // nearest the search box.
    nav: [
      {
        text: 'Guide',
        link: '/guide/getting-started',
        activeMatch: '/guide/|/api',
      },
      { text: 'Symbols', link: '/notation/', activeMatch: '/notation/' },
      { text: 'Fonts', link: '/fonts/', activeMatch: '/fonts/' },
    ],
    // Every page gets the same sidebar, /fonts/ included — one page dropping
    // it just makes the sidebar flicker in and out as you move around.
    sidebar: {
      '/guide/': DOCS_SIDEBAR,
      '/api': DOCS_SIDEBAR,
      '/notation/': DOCS_SIDEBAR,
      '/fonts/': DOCS_SIDEBAR,
    },
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    footer: {
      message:
        'Code MIT · Fonts OFL 1.1 · Inspired by the Omenad Bhatkhande fonts',
    },
  },
});
