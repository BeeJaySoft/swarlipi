import { defineConfig } from 'vitepress';

// The renderer's default faces. The stylesheet does not fetch fonts; the site
// loads the Noto families the way an integrator would. Load-bearing, not
// decoration: a script whose face is missing renders in an OS fallback whose
// letter heights the mark calibration was never measured against, so the dots
// and bars land wrong — visibly, and with nothing in the console.
const NOTO_FAMILIES = [
  'Noto+Sans+Gurmukhi',
  'Noto+Sans+Devanagari',
  'Noto+Sans+Bengali',
  'Noto+Sans+Gujarati',
  'Noto+Sans',
];
const FONTS =
  'https://fonts.googleapis.com/css2?' +
  NOTO_FAMILIES.map((f) => `family=${f}:wght@400..700`).join('&') +
  '&display=swap';

// The package's own fonts, served from npm the way the page tells you to.
const SWARLIPI_FONTS =
  'https://cdn.jsdelivr.net/npm/swarlipi@0.2/fonts/swarlipi-fonts.css';

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

// Absolute base for link-preview URLs; crawlers do not resolve relative paths.
const SITE_URL = 'https://swarlipi.beejaysoft.com/';

export default defineConfig({
  title: 'Swarlipi',
  description:
    'Bhatkhande notation as real Unicode text, in five scripts, with no notation font.',
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
    // Link previews. VitePress emits title/description into <head> but no
    // og:/twitter: tags, so shares render as a bare card with just the domain.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Swarlipi' }],
    [
      'meta',
      {
        property: 'og:title',
        content: 'Swarlipi — Bhatkhande notation without a notation font',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Real Unicode letters in Gurmukhi, Devanagari, Bengali, Gujarati or Latin, with every mark drawn by CSS and SVG. It copies, it searches, it prints.',
      },
    ],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:image', content: `${SITE_URL}og-image.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    [
      'meta',
      {
        property: 'og:image:alt',
        content:
          'Swarlipi — the same notation rendered in Gurmukhi, Devanagari, Bengali, Gujarati and Latin',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    [
      'meta',
      {
        name: 'twitter:title',
        content: 'Swarlipi — Bhatkhande notation without a notation font',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          'Real Unicode letters in five scripts, with every mark drawn by CSS and SVG.',
      },
    ],
    ['meta', { name: 'twitter:image', content: `${SITE_URL}og-image.png` }],
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
    socialLinks: [
      { icon: 'github', link: 'https://github.com/BeeJaySoft/swarlipi' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/swarlipi' },
    ],
    // The public repo mirrors the monorepo package: a suggested edit arrives
    // there as a pull request and is applied upstream by hand.
    editLink: {
      pattern: 'https://github.com/BeeJaySoft/swarlipi/edit/main/docs/:path',
      text: 'Suggest a change to this page',
    },
    outline: { level: [2, 3] },
    footer: {
      message:
        'Code MIT · Fonts OFL 1.1 · Inspired by the Omenad Bhatkhande fonts',
    },
  },
});
