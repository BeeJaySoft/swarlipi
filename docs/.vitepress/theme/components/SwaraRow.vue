<script setup lang="ts">
import { SCRIPTS } from '../state';
import Swara from './Swara.vue';

withDefaults(
  defineProps<{
    notes: string;
    size?: string;
    editing?: boolean;
    bold?: boolean;
  }>(),
  { size: '1.75rem', editing: false, bold: false }
);
</script>

<template>
  <div class="sw-card sw-row">
    <code class="sw-code sw-row-code">{{ notes }}</code>
    <div class="sw-row-scripts">
      <div v-for="s in SCRIPTS" :key="s.id" class="sw-row-cell">
        <span class="sw-run">
          <Swara
            :notes="notes"
            :lang="s.id"
            :size="size"
            :editing="editing"
            :bold="bold"
          />
        </span>
        <span class="sw-label">{{ s.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-row {
  margin: 1rem 0;
  padding: 0.75rem 1rem 0.9rem;
}
.sw-row-code {
  display: block;
  margin-bottom: 0.5rem;
}
/* Cells take their content's width and wrap: a long beat in four scripts is
 * wider than one line, and fixed quarters would run the runs into each other. */
.sw-row-scripts {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 0.5rem 1.5rem;
}
.sw-row-cell {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}
</style>
