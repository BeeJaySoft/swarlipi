<script setup lang="ts">
import { bold, editing, sizePx } from '../state';
import ScriptSwitch from './ScriptSwitch.vue';
</script>

<template>
  <div class="sw-controls">
    <ScriptSwitch />
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
