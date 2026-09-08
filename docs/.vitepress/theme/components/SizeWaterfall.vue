<script setup lang="ts">
import { bold, lang } from '../state';
import Swara from './Swara.vue';

/** 18px is the notation grid's beat cell — the size the marks have to survive. */
const SIZES = [
  { px: 18, note: 'beat cell' },
  { px: 24, note: '' },
  { px: 40, note: '' },
  { px: 96, note: '' },
];

const NOTES = '$qsrgme {p}Du';
</script>

<template>
  <div class="sw-fall-scroll">
    <div class="sw-fall">
      <div v-for="s in SIZES" :key="s.px" class="sw-fall-row">
        <span class="sw-label"
          >{{ s.px }}px<template v-if="s.note"> · {{ s.note }}</template></span
        >
        <span class="sw-fall-run">
          <Swara :notes="NOTES" :lang="lang" :size="`${s.px}px`" :bold="bold" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The scroll box is the OUTER element. `overflow-x: auto` drags overflow-y to
   auto with it, and on Latin the rows were 6px taller than the box — enough to
   hide the bottom row's baseline behind a scroll nobody would think to try. */
.sw-fall-scroll {
  margin: 1rem 0 1.5rem;
  overflow-x: auto;
}
.sw-fall {
  display: grid;
  gap: 0.5rem;
  width: max-content;
  min-width: 100%;
}
.sw-fall-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.sw-fall-row .sw-label {
  flex: 0 0 auto;
  width: 6.5rem;
  padding-bottom: 0.35em;
  white-space: nowrap;
}
.sw-fall-run {
  white-space: nowrap;
}
/* Room for the marks on BOTH sides of the line box. Latin's baseline sits far
   lower in the em box than the Indic scripts', so its komal underline hung
   ~0.06em below the row — and the scroll box's overflow-y hid it. */
.sw-fall-run .sw-swara {
  padding-top: 0.5em;
  padding-bottom: 0.2em;
}
</style>
