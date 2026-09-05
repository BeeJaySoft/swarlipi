<script setup lang="ts">
import { SCRIPTS, bold, editing, lang, sizePx } from '../state';
</script>

<template>
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
      <input v-model.number="sizePx" type="range" min="16" max="64" />
      <span>{{ sizePx }}px</span>
    </label>
    <label class="sw-ctl">
      <input v-model="bold" type="checkbox" />
      Bold
    </label>
    <label class="sw-ctl">
      <input v-model="editing" type="checkbox" />
      Editing mode
    </label>
  </div>
</template>
