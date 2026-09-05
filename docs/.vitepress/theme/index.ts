import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import 'swarlipi/style.css';
import './custom.css';
import HeroSample from './components/HeroSample.vue';
import Swara from './components/Swara.vue';
import SwaraRow from './components/SwaraRow.vue';
import SheetControls from './components/SheetControls.vue';
import SampleSheet from './components/SampleSheet.vue';
import CrossBeat from './components/CrossBeat.vue';
import Playground from './components/Playground.vue';
import SymbolTable from './components/SymbolTable.vue';

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroSample),
    }),
  enhanceApp({ app }) {
    app.component('Swara', Swara);
    app.component('SwaraRow', SwaraRow);
    app.component('SheetControls', SheetControls);
    app.component('SampleSheet', SampleSheet);
    app.component('CrossBeat', CrossBeat);
    app.component('Playground', Playground);
    app.component('SymbolTable', SymbolTable);
  },
} satisfies Theme;
