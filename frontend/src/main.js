import { createApp, h } from 'vue';

const app = createApp({
  name: 'PsmSimpleApp',
  render() {
    return h('div', { hidden: true, 'data-vue-entry': 'psmsimple' }, 'PSMSimple Vue entry ready');
  },
});

app.mount('#psm-vue-app');
