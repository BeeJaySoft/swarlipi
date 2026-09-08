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
import SizeWaterfall from './components/SizeWaterfall.vue';
import FontSpecimen from './components/FontSpecimen.vue';
import FontDownloads from './components/FontDownloads.vue';

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroSample),
      'home-features-before': () =>
        h('div', { class: 'sw-home' }, [h('h2', 'Try it'), h(Playground)]),
    }),
  enhanceApp({ app }) {
    app.component('Swara', Swara);
    app.component('SwaraRow', SwaraRow);
    app.component('SheetControls', SheetControls);
    app.component('SampleSheet', SampleSheet);
    app.component('CrossBeat', CrossBeat);
    app.component('SymbolTable', SymbolTable);
    app.component('SizeWaterfall', SizeWaterfall);
    app.component('FontSpecimen', FontSpecimen);
    app.component('FontDownloads', FontDownloads);
  },
} satisfies Theme;
