import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';

import AppRoot from './app/AppRoot.js';
import { getPrimeVueOptions } from './app/primevueConfig.js';
import router from './app/router.js';
import './styles/primevue.css';

const app = createApp(AppRoot);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, getPrimeVueOptions());

app.mount('#psm-vue-app');
