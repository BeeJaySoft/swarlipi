<script setup lang="ts">
/**
 * The three install downloads. A component rather than three hand-written
 * anchors in the markdown: the icon is written once, and the sizes live in one
 * place instead of being repeated per card.
 */
const CDN = 'https://cdn.jsdelivr.net/npm/swarlipi@0.1/fonts';
const FONTS = [
  { label: 'Gurmukhi', file: 'SwarlipiGurmukhi-Variable.ttf', size: '97 KB' },
  {
    label: 'Devanagari',
    file: 'SwarlipiDevanagari-Variable.ttf',
    size: '321 KB',
  },
  { label: 'Bengali', file: 'SwarlipiBengali-Variable.ttf', size: '221 KB' },
];
</script>

<template>
  <div class="sw-fonts">
    <a
      v-for="f in FONTS"
      :key="f.file"
      class="sw-font-dl"
      :href="`${CDN}/${f.file}`"
      download
    >
      <span class="sw-dl-text">
        <strong>{{ f.label }}</strong>
        <span>TTF · {{ f.size }}</span>
      </span>
      <!-- Tray-and-arrow, stroked with currentColor so it follows the theme. -->
      <svg
        class="sw-dl-icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 20h16" />
      </svg>
    </a>
  </div>
</template>
