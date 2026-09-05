<script setup lang="ts">
import { CROSS_BEAT_SAMPLES } from 'swarlipi/samples';
import { bold, editing, lang, sizePx } from '../state';
import Swara from './Swara.vue';
</script>

<template>
  <div class="sw-cross-list">
    <div
      v-for="c in CROSS_BEAT_SAMPLES"
      :key="c.title"
      class="sw-card sw-cross"
    >
      <div class="sw-cross-head">
        <strong>{{ c.title }}</strong>
        <p v-if="c.note" class="sw-note">{{ c.note }}</p>
      </div>
      <div class="sw-beats">
        <div v-for="(b, i) in c.beats" :key="i" class="sw-beat">
          <span class="sw-run">
            <Swara
              :notes="b"
              :lang="lang"
              :size="`${sizePx}px`"
              :editing="editing"
              :bold="bold"
            />
          </span>
          <code class="sw-code">{{ b }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-cross-list {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0 1.5rem;
}
.sw-cross {
  padding: 0.75rem 1rem 0.9rem;
}
.sw-cross-head strong {
  font-size: 0.95rem;
}
.sw-cross-head .sw-note {
  margin-bottom: 0.5rem;
}
.sw-beats {
  display: flex;
  flex-wrap: wrap;
}
.sw-beat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 5.5rem;
  padding: 0.25rem 0.5rem;
  border-left: 1px solid var(--vp-c-divider);
}
.sw-beat:first-child {
  border-left: 0;
}
</style>
