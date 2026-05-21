export const tabToPath = {
  home: '/',
  betrieb: '/betrieb',
  psm: '/psm',
  einsatzorte: '/fields',
  kulturen: '/cultures',
  export: '/export',
  history: '/history',
  settings: '/settings',
  forecast: '/prediction',
  inventory: '/inventory',
};

const pathToTab = {
  '': 'home',
  home: 'home',
  betrieb: 'betrieb',
  farm: 'betrieb',
  psm: 'psm',
  fields: 'einsatzorte',
  cultures: 'kulturen',
  export: 'export',
  history: 'history',
  settings: 'settings',
  prediction: 'forecast',
  inventory: 'inventory',
};

export const eoMapDefault = [51.1657, 10.4515];
export const eoMapDefaultZoom = 6;
export const eoMapPointZoom = 15;

export function getTabFromPath(pathname = window.location.pathname) {
  const path = pathname.replace(/^\/+|\/+$/g, '');
  return pathToTab[path] || 'home';
}

export function readBootstrapData() {
  const el = document.getElementById('psm-bootstrap-data');
  if (!el) return {};

  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    console.warn('Vue-Bootstrap-Daten konnten nicht gelesen werden.', err);
    return {};
  }
}
