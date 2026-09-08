<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CROSS_BEAT_SAMPLES } from 'swarlipi/samples';
import { bridgeElement, measureBridges } from 'swarlipi/bridge';
import { bold, editing, lang, sizePx } from '../state';
import Swara from './Swara.vue';

/**
 * The page is about joining fragments, so it draws the joined line by default
 * and keeps the raw fragments one checkbox away. The spans come from the
 * sample data, because which beats pair is the host's rule, not the
 * renderer's.
 */
const joined = ref(true);

const rows: (HTMLElement | null)[] = [];
const setRow = (el: unknown, i: number) => {
  rows[i] = (el as HTMLElement | null) ?? null;
};

const draw = async () => {
  // Swara renders with v-html, so any state change replaces the zone elements
  // and drops the inline anchor-name measureBridges wrote. Wait for Vue's
  // patch, then for the script font: a bar measured against a fallback face
  // sits at the wrong height and never corrects itself.
  await nextTick();
  await document.fonts?.ready;
  rows.forEach((row, i) => {
    if (!row) return;
    // Stale geometry: replace the bars, never append to them.
    for (const old of row.querySelectorAll('[data-sl-bar]')) old.remove();
    const spans = CROSS_BEAT_SAMPLES[i]?.spans ?? [];
    if (!joined.value || !spans.length) return;
    const cells = [...row.querySelectorAll<HTMLElement>('.sw-beat')];
    const bars = measureBridges({
      container: row,
      cellAt: (b) => cells[b],
      spans,
      anchorPrefix: `--sw-cb-${i}`,
    });
    for (const bar of bars) row.append(bridgeElement(bar));
  });
};

let observer: ResizeObserver | null = null;
onMounted(() => {
  void draw();
  observer = new ResizeObserver(() => void draw());
  for (const row of rows) if (row) observer.observe(row);
});
onBeforeUnmount(() => observer?.disconnect());
watch([lang, sizePx, bold, editing, joined], () => void draw());
</script>

<template>
  <label class="sw-ctl sw-cross-toggle">
    <input v-model="joined" type="checkbox" />
    Join the fragments
  </label>

  <div class="sw-cross-list">
    <div
      v-for="(c, ci) in CROSS_BEAT_SAMPLES"
      :key="c.title"
      class="sw-card sw-cross"
    >
      <div class="sw-cross-head">
        <strong>{{ c.title }}</strong>
        <p v-if="c.note" class="sw-note">{{ c.note }}</p>
      </div>
      <div class="sw-beats-scroll">
        <div :ref="(el) => setRow(el, ci)" class="sw-beats">
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
  </div>
</template>

<style scoped>
.sw-cross-toggle {
  margin: 0 0 1rem;
}
.sw-cross-list {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0 1.5rem;
}
.sw-cross {
  padding: 0.75rem 1rem 0.9rem;
  /* A grid item's min-width is auto, so a max-content beat row inside would
     stretch the card past the viewport instead of letting the scroll box
     bound it. */
  min-width: 0;
}
.sw-cross-head strong {
  font-size: 0.95rem;
}
.sw-cross-head .sw-note {
  margin-bottom: 0.5rem;
}
/* The scroll box is the OUTER element: overflow on .sw-beats itself would
   clip the bars, and a wrapped row splits every bridge into row-end pieces —
   which is correct behaviour for a wrap, but not what this page is showing. */
.sw-beats-scroll {
  overflow-x: auto;
}
.sw-beats {
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  /* The bars are absolutely positioned in here and anchor to zones inside it.
     Without this they escape to the nearest positioned ancestor. */
  position: relative;
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
