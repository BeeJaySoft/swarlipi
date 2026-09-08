<script setup lang="ts">
import { SCRIPTS, lang } from '../state';

/** The script picker, shared by every surface that has one. */
</script>

<template>
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
</template>
