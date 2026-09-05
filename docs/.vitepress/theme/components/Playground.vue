<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  renderSwarlipi,
  swarlipiWrapperClass,
  toUnicodeNotation,
  type SwarlipiScript,
} from 'swarlipi';
import { SCRIPTS } from '../state';
import Swara from './Swara.vue';

const notes = ref('$srgm {p}d nu-');
const lang = ref<SwarlipiScript>('punjabi');
const sizePx = ref(40);
const bold = ref(false);
const editing = ref(false);
const showHtml = ref(false);

const unicode = computed(() => toUnicodeNotation(notes.value, lang.value));
const html = computed(() =>
  renderSwarlipi(notes.value, lang.value, { editing: editing.value })
);
const wrapClass = computed(() => swarlipiWrapperClass(lang.value));

/** Quick inserts, grouped the way the grammar is. */
const CHIPS: { label: string; items: { text: string; title: string }[] }[] = [
  {
    label: 'Swaras',
    items: 'srgmpdn'.split('').map((c) => ({ text: c, title: c })),
  },
  {
    label: 'Komal / tivra',
    items: [
      { text: 'R', title: 'komal Re' },
      { text: 'G', title: 'komal Ga' },
      { text: 'M', title: 'tivra Ma' },
      { text: 'D', title: 'komal Dha' },
      { text: 'N', title: 'komal Ni' },
    ],
  },
  {
    label: 'Octave',
    items: [
      { text: 'u', title: 'taar (dot above)' },
      { text: 'U', title: 'ati-taar (two dots above)' },
      { text: 'l', title: 'mandra (dot below)' },
      { text: 'L', title: 'ati-mandra (two dots below)' },
    ],
  },
  {
    label: 'Marks',
    items: [
      { text: '{m}', title: 'kan (grace note)' },
      { text: '@', title: 'chhand over 2 slots' },
      { text: '$', title: 'chhand over 4 slots' },
      { text: '-', title: 'sustain' },
      { text: 'q', title: 'meend start' },
      { text: 'e', title: 'meend end' },
      { text: 'w', title: 'meend continuation (next beat)' },
      { text: 'W', title: 'continuation with a struck note' },
      { text: 'Q', title: 'ghaseet start' },
      { text: 'E', title: 'ghaseet end' },
      { text: ';', title: 'bol da' },
      { text: "'", title: 'bol ra' },
      { text: '(r)', title: 'murki' },
    ],
  },
];

const input = ref<HTMLInputElement | null>(null);
const insert = (text: string) => {
  const el = input.value;
  if (!el) {
    notes.value += text;
    return;
  }
  const start = el.selectionStart ?? notes.value.length;
  const end = el.selectionEnd ?? start;
  notes.value = notes.value.slice(0, start) + text + notes.value.slice(end);
  const caret = start + text.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
};

const copied = ref(false);
const copyUnicode = async () => {
  try {
    await navigator.clipboard.writeText(unicode.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {
    /* clipboard blocked: the text is selectable anyway */
  }
};
</script>

<template>
  <div class="sw-play">
    <div class="sw-card sw-play-input">
      <label class="sw-label" for="sw-notes">Notation</label>
      <input
        id="sw-notes"
        ref="input"
        v-model="notes"
        type="text"
        spellcheck="false"
        autocomplete="off"
        placeholder="Type a beat, e.g. $srgm"
      />
      <div class="sw-chips">
        <div v-for="g in CHIPS" :key="g.label" class="sw-chip-group">
          <span class="sw-label">{{ g.label }}</span>
          <button
            v-for="c in g.items"
            :key="c.text"
            type="button"
            class="sw-chip"
            :title="c.title"
            @click="insert(c.text)"
          >
            {{ c.text }}
          </button>
        </div>
      </div>
    </div>

    <div class="sw-controls">
      <div class="sw-seg" role="tablist" aria-label="Script">
        <button
          v-for="s in SCRIPTS"
          :key="s.id"
          type="button"
          role="tab"
          :aria-selected="lang === s.id"
          :class="{ active: lang === s.id }"
          @click="lang = s.id"
        >
          {{ s.label }}
        </button>
      </div>
      <label class="sw-ctl">
        Size
        <input v-model.number="sizePx" type="range" min="16" max="96" />
        <span>{{ sizePx }}px</span>
      </label>
      <label class="sw-ctl"
        ><input v-model="bold" type="checkbox" /> Bold</label
      >
      <label class="sw-ctl">
        <input v-model="editing" type="checkbox" /> Editing mode
      </label>
    </div>

    <div class="sw-card sw-stage">
      <Swara
        :notes="notes"
        :lang="lang"
        :size="`${sizePx}px`"
        :editing="editing"
        :bold="bold"
      />
    </div>

    <div class="sw-play-all">
      <div v-for="s in SCRIPTS" :key="s.id" class="sw-card sw-play-cell">
        <span class="sw-run">
          <Swara
            :notes="notes"
            :lang="s.id"
            size="1.6rem"
            :editing="editing"
            :bold="bold"
          />
        </span>
        <span class="sw-label">{{ s.label }}</span>
      </div>
    </div>

    <div class="sw-card sw-out">
      <div class="sw-out-head">
        <span class="sw-label">Plain-text Unicode</span>
        <button type="button" class="sw-chip" @click="copyUnicode">
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>
      <p :class="[wrapClass, 'sw-unicode']">{{ unicode }}</p>
      <p class="sw-note">
        Letters plus combining marks. Whether the marks show depends on the
        destination font; chhand and meend have no plain-text form.
      </p>
    </div>

    <div class="sw-card sw-out">
      <button type="button" class="sw-toggle" @click="showHtml = !showHtml">
        {{ showHtml ? 'Hide' : 'Show' }} generated HTML
      </button>
      <pre v-if="showHtml" class="sw-html"><code>{{ html }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.sw-play {
  display: grid;
  gap: 0.9rem;
}
.sw-play-input {
  padding: 0.9rem 1rem 1rem;
}
.sw-play-input input {
  display: block;
  width: 100%;
  margin: 0.35rem 0 0.75rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 1.05rem;
}
.sw-play-input input:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}
.sw-chips {
  display: grid;
  gap: 0.45rem;
}
.sw-chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}
.sw-chip-group .sw-label {
  min-width: 6.5rem;
}
.sw-chip,
.sw-toggle {
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.5;
  transition: border-color 0.15s;
}
.sw-toggle {
  font-family: var(--vp-font-family-base);
}
.sw-chip:hover,
.sw-toggle:hover {
  border-color: var(--vp-c-brand-1);
}
.sw-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 9rem;
  padding: 1.25rem 1rem;
  overflow-x: auto;
}
.sw-play-all {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.sw-play-cell {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.4rem 0.75rem 0.6rem;
}
.sw-out {
  padding: 0.8rem 1rem 0.9rem;
}
.sw-out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sw-unicode {
  margin: 0.35rem 0 0.25rem;
  font-size: 1.5rem;
  line-height: 1.8;
  user-select: all;
}
.sw-html {
  margin: 0.6rem 0 0;
  padding: 0.75rem 0.9rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
