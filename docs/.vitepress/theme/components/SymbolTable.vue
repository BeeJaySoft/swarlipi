<script setup lang="ts">
import { SYMBOL_GROUPS } from 'swarlipi/reference';
import { bold, editing, lang, sizePx } from '../state';
import Swara from './Swara.vue';
</script>

<template>
  <div class="sw-symbols">
    <section v-for="g in SYMBOL_GROUPS" :key="g.id" class="sw-symbol-group">
      <h4 :id="`symbols-${g.id}`">{{ g.title }}</h4>
      <table class="sw-symbol-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Meaning</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(e, i) in g.entries" :key="i">
            <td>
              <code>{{ e.key }}</code>
            </td>
            <td>{{ e.name }}</td>
            <td>
              <span class="sw-symbol-example">
                <Swara
                  :notes="e.example"
                  :lang="lang"
                  :size="`${Math.round(sizePx * 0.8)}px`"
                  :editing="editing"
                  :bold="bold"
                />
                <code class="sw-code">{{ e.example }}</code>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.sw-symbol-group {
  margin: 1.25rem 0 1.75rem;
}
.sw-symbol-group h4 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}
.sw-symbol-table {
  width: 100%;
  display: table;
  margin: 0;
}
.sw-symbol-table th:nth-child(1),
.sw-symbol-table td:nth-child(1) {
  width: 6.5rem;
  white-space: nowrap;
}
.sw-symbol-table td:nth-child(3) {
  white-space: nowrap;
}
.sw-symbol-example {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
