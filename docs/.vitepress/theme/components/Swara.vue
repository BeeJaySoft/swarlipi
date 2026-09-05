<script setup lang="ts">
import { computed } from 'vue';
import {
  renderSwarlipi,
  swarlipiWrapperClass,
  type SwarlipiScript,
} from 'swarlipi';

const props = withDefaults(
  defineProps<{
    notes: string;
    lang?: SwarlipiScript;
    /** CSS font-size of the OUTER element; the wrapper adds its own bump. */
    size?: string;
    editing?: boolean;
    bold?: boolean;
  }>(),
  { lang: 'punjabi', size: '1.75rem', editing: false, bold: false }
);

const html = computed(() =>
  renderSwarlipi(props.notes, props.lang, { editing: props.editing })
);
// The wrapper class must sit on an INNER element: `.sl-wrap` carries the run's
// own font-size and line-height, so the caller sizes the element around it.
const wrapClass = computed(() => [
  swarlipiWrapperClass(props.lang),
  { 'sl-bold': props.bold },
]);
</script>

<template>
  <span class="sw-swara" :style="{ fontSize: size }">
    <span :class="wrapClass" v-html="html" />
  </span>
</template>

<style scoped>
.sw-swara {
  display: inline-block;
  white-space: nowrap;
}
</style>
