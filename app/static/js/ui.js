function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toast(message, duration = 2600) {
  const el = $('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}
const tabToPath = {
  home: "/",
  betrieb: "/betrieb",
  psm: "/psm",
  einsatzorte: "/fields",
  kulturen: "/cultures",
  export: "/export",
  history: "/history",
  settings: "/settings",
};

const pathToTab = {
  "": "home",
  "home": "home",
  "betrieb": "betrieb",
  "farm": "betrieb",
  "psm": "psm",
  "fields": "einsatzorte",
  "cultures": "kulturen",
  "export": "export",
  "history": "history",
  "settings": "settings",
};
function showTab(tabName, el, push = true) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');

  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');

  if (push) {
    history.pushState({ tab: tabName }, '', tabToPath[tabName] || "/farm");
  }
}

function getTabFromPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  return pathToTab[path] || "home";
}


function openModal(id) {
  const el = $(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove('open');
}

function toggleUserPopup() {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (!popup || !button) return;

  const isOpen = popup.classList.contains('open');

  popup.classList.toggle('open', !isOpen);
  button.classList.toggle('open', !isOpen);

  if (!isOpen) {
    positionUserPopup();
  }
}

function closeUserPopup() {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (popup) popup.classList.remove('open');
  if (button) button.classList.remove('open');
}

function positionUserPopup() {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (!popup || !button) return;

  const rect = button.getBoundingClientRect();
  const popupWidth = 212;
  const left = rect.left;
  const top = rect.top - 8 - popup.offsetHeight;

  popup.style.left = `${Math.max(8, left)}px`;
  popup.style.top = `${Math.max(8, top)}px`;
  popup.style.width = `${popupWidth}px`;
}

document.addEventListener('click', (event) => {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (!popup || !button) return;

  const clickedInsidePopup = popup.contains(event.target);
  const clickedButton = button.contains(event.target);

  if (!clickedInsidePopup && !clickedButton) {
    closeUserPopup();
  }
});

window.addEventListener('resize', () => {
  const popup = $('user-popup');
  if (popup && popup.classList.contains('open')) {
    positionUserPopup();
  }
});

window.addEventListener('popstate', (event) => {
  const tabName = (event.state && event.state.tab)
    ? event.state.tab
    : getTabFromPath();
 
  const navLink = document.querySelector(`nav a[onclick*="'${tabName}'"]`);
  showTab(tabName, navLink, false);  // false = don't push again
 
  // Re-run loaders that need fresh data
  if (tabName === 'history' && typeof loadHistory === 'function') loadHistory();
  if (tabName === 'export'  && typeof loadExportSelections === 'function') {
    loadExportSelections();
    if (typeof syncLegacyExportUI === 'function') syncLegacyExportUI();
  }
});
 
// ── On initial page load: activate correct tab from URL & set initial state ──
document.addEventListener('DOMContentLoaded', () => {
  const tabName = getTabFromPath();
  const navLink = document.querySelector(`nav a[onclick*="'${tabName}'"]`);
  showTab(tabName, navLink, false);
  // Replace so the initial entry also carries state for popstate
  history.replaceState({ tab: tabName }, '', window.location.pathname);
});