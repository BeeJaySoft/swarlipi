<script setup lang="ts">
import { computed } from 'vue';
import { SAMPLE_GROUPS } from 'swarlipi/samples';
import { bold, editing, lang, sizePx } from '../state';
import Swara from './Swara.vue';

const props = defineProps<{
  /** Title of the group in `swarlipi/samples`. */
  group: string;
  /** Skip the group's note (when the page text already says it). */
  noNote?: boolean;
}>();

const group = computed(() =>
  SAMPLE_GROUPS.find((g) => g.title === props.group)
);
</script>

<template>
  <div v-if="group" class="sw-sheet">
    <p v-if="group.note && !noNote" class="sw-note">{{ group.note }}</p>
    <div class="sw-grid">
      <div v-for="n in group.samples" :key="n" class="sw-card sw-sample">
        <span class="sw-run">
          <Swara
            :notes="n"
            :lang="lang"
            :size="`${sizePx}px`"
            :editing="editing"
            :bold="bold"
          />
        </span>
        <code class="sw-code">{{ n }}</code>
      </div>
    </div>
  </div>
  <p v-else class="sw-note">No sample group named “{{ props.group }}”.</p>
</template>

<style scoped>
.sw-sheet {
  margin: 1rem 0 1.5rem;
}
.sw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
}
.sw-sample {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.5rem 0.6rem;
  min-width: 0;
  overflow: hidden;
}
</style>
