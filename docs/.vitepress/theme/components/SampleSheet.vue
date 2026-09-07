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
/* Wrapping flex, not a fixed grid: a sample is one beat OR a whole row
   ("s r g m p d n"), so a card has to be allowed to size to its run. In a
   `minmax(140px, 1fr)` grid every card was capped at the column width and the
   wide rows were centre-cropped — sa lost off the left, Ni off the right. The
   140px floor keeps the single-symbol groups looking like a grid anyway. */
.sw-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  /* A single card can still be wider than a phone at the top of the size
     slider. Scroll the ROW, never the card or the run: the marks live inside
     a card, so the row's box contains them and this clips nothing — whereas a
     scroll box on the card cuts the meend hooks that overhang the line. */
  overflow-x: auto;
}
.sw-sample {
  display: flex;
  /* 0 0 auto, and no max-width: a card must never be squeezed below its run.
     With `0 1 auto` + `max-width: 100%` a wide row was capped at the viewport
     and `.sw-run` centres it, so it spilled over BOTH edges — and the
     inline-start half is not reachable by scrolling, which lost `sa` off the
     left all over again. Un-shrinkable, the row scrolls instead (above). */
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.5rem 0.6rem;
  min-width: 140px;
}
/* No `overflow` on the card or the run, deliberately. A meend hook, a ghaseet
   bracket and the taar dots are absolutely positioned ABOVE the line box, and
   any scroll container clips both axes — CSS drags `overflow-y` from visible
   to auto as soon as `overflow-x` is auto — which sliced the tops off every
   meend and ghaseet. Cards size to their run instead (flex, above), so at
   ordinary sizes nothing overflows at all. */
</style>
