import { createRouter, createWebHistory } from 'vue-router';

import { tabToPath } from './bootstrap.js';

const routeComponent = { render: () => null };

const routes = [
  { path: tabToPath.home, name: 'home', component: routeComponent },
  { path: tabToPath.betrieb, name: 'betrieb', component: routeComponent },
  { path: '/farm', redirect: tabToPath.betrieb },
  { path: tabToPath.psm, name: 'psm', component: routeComponent },
  { path: tabToPath.einsatzorte, name: 'einsatzorte', component: routeComponent },
  { path: tabToPath.kulturen, name: 'kulturen', component: routeComponent },
  { path: tabToPath.export, name: 'export', component: routeComponent },
  { path: tabToPath.history, name: 'history', component: routeComponent },
  { path: tabToPath.settings, name: 'settings', component: routeComponent },
  { path: tabToPath.forecast, name: 'forecast', component: routeComponent },
  { path: tabToPath.inventory, name: 'inventory', component: routeComponent },
  { path: tabToPath.meldungen, name: 'meldungen', component: routeComponent },
  { path: '/:pathMatch(.*)*', redirect: tabToPath.home },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
