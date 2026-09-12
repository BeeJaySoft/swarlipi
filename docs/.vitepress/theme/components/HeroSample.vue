<script setup lang="ts">
import { SCRIPTS } from '../state';
import Swara from './Swara.vue';

/** A phrase of four real beats, once per script. */
const BEATS = ['#mpd', '@gm', '@nlr', 'su'];
</script>

<template>
  <div class="sw-hero">
    <div v-for="s in SCRIPTS" :key="s.id" class="sw-hero-row">
      <span class="sw-label">{{ s.label }}</span>
      <div class="sw-hero-beats">
        <span v-for="(b, i) in BEATS" :key="i" class="sw-hero-beat">
          <Swara :notes="b" :lang="s.id" size="clamp(1rem, 9.5cqi, 2rem)" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-hero {
  display: grid;
  gap: 0.35rem;
  /* The card is the size container the beats scale against: the widest beat
     (three Latin caps) has to fit its quarter of the card, and a fixed 2rem
     did not, at any width. The tigun opener is what lets 2rem stand as the
     ceiling — a four-slot one caps the card's own width at 25.7px. */
  container-type: inline-size;
  width: 380px;
  max-width: 100%;
  margin-inline: auto;
  padding: 1rem 1.1rem 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}
.sw-hero-row {
  display: grid;
  gap: 0.1rem;
}
.sw-hero-beats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.sw-hero-beat {
  display: flex;
  justify-content: center;
  padding: 0.15rem 0;
  border-left: 1px solid var(--vp-c-divider);
  white-space: nowrap;
}
.sw-hero-beat:first-child {
  border-left: 0;
}
</style>
