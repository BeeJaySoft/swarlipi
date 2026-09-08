<script setup lang="ts">
import { computed } from 'vue';
import { toUnicodeNotation, type SwarlipiScript } from 'swarlipi';
import { lang } from '../state';
import ScriptSwitch from './ScriptSwitch.vue';

/**
 * The specimen for the FONTS, not the renderer: plain Unicode text — letter
 * plus combining mark — set in the Swarlipi face, which is exactly what lands
 * in Word or a PDF when notation is copied out. Latin has no Swarlipi face
 * because Noto Sans already carries all six marks.
 */
const FAMILY: Record<SwarlipiScript, string> = {
  punjabi: 'Swarlipi Gurmukhi',
  hindi: 'Swarlipi Devanagari',
  bangla: 'Swarlipi Bengali',
  english: 'Noto Sans',
};

/* One phrase everywhere, the ascending scale: komal, tivra and a taar dot in
   the places they actually occur. */
const SCALE = 's R g m M p D n su';

const family = computed(() => `'${FAMILY[lang.value]}', sans-serif`);
const scale = computed(() => toUnicodeNotation(SCALE, lang.value));
const WEIGHTS = [400, 500, 600, 700];
</script>

<template>
  <div class="sw-spec">
    <ScriptSwitch />

    <p class="sw-note">
      {{ FAMILY[lang] }} — real text, not a picture. Select it and copy it.
    </p>

    <div class="sw-spec-big" :style="{ fontFamily: family }">{{ scale }}</div>

    <span class="sw-label">Weight 400 – 700</span>
    <div
      v-for="w in WEIGHTS"
      :key="w"
      class="sw-spec-row"
      :style="{ fontFamily: family, fontWeight: w }"
    >
      <span class="sw-spec-w">{{ w }}</span>
      <span>{{ scale }}</span>
    </div>

    <span class="sw-label">At 18px</span>
    <div class="sw-spec-small" :style="{ fontFamily: family }">
      {{ scale }}
    </div>
  </div>
</template>

<style scoped>
.sw-spec {
  margin: 1.5rem 0 2rem;
  padding: 1.25rem 1.4rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  /* The 64px line is wider than the column on a phone. Scroll the box, not
     the page — and there is nothing overhanging the line box here (the marks
     are in the font), so a plain scroll container clips nothing. */
  overflow-x: auto;
}
.sw-spec-big {
  margin: 0.5rem 0 1.5rem;
  font-size: 64px;
  line-height: 1.5;
  white-space: nowrap;
}
.sw-spec-row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin: 0.35rem 0;
  font-size: 30px;
  line-height: 1.6;
  white-space: nowrap;
}
.sw-spec-w {
  flex: 0 0 auto;
  width: 2.5rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--vp-c-text-3);
}
.sw-spec-small {
  margin: 0.5rem 0 0;
  font-size: 18px;
  line-height: 1.8;
  white-space: nowrap;
}
.sw-spec .sw-label {
  display: block;
  margin-top: 1.25rem;
}
</style>
