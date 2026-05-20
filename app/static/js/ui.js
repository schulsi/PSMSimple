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

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

async function apiGet(url) {
  const res = await fetch(url, {
    credentials: 'same-origin'
  });

  const contentType = res.headers.get('Content-Type') || '';

  if (!res.ok) {
    let message = `GET ${url} fehlgeschlagen`;
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch (_) {
        // Keep the generic error when the response body is not valid JSON.
      }
    }
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res;
}

async function apiSend(url, method, data = null) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': getCsrfToken()
    }
  };

  if (data !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  const contentType = res.headers.get('Content-Type') || '';

  if (!res.ok) {
    let message = `${method} ${url} fehlgeschlagen`;
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch (_) {
        // Keep the generic error when the response body is not valid JSON.
      }
    }
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res;
}

async function apiPost(url, data) {
  return apiSend(url, 'POST', data);
}

async function apiPut(url, data) {
  return apiSend(url, 'PUT', data);
}

async function apiDelete(url) {
  return apiSend(url, 'DELETE');
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
  forecast: "/prediction",
  inventory: "/inventory"
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
  "prediction": "forecast",
  "inventory": "inventory"
};

window.PSM_TAB_TO_PATH = tabToPath;
window.PSM_PATH_TO_TAB = pathToTab;

function showTab(tabName, el, push = true, source = 'legacy') {
  if (source !== 'vue' && window.psmVueApp?.showTab) {
    window.psmVueApp.showTab(tabName, el, push);
    return;
  }

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');

  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');

  closeUserPopup(source);

  if (push) {
    history.pushState({ tab: tabName }, '', tabToPath[tabName] || "/betrieb");
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

function toggleUserPopup(source = 'legacy') {
  if (source !== 'vue' && window.psmVueApp?.toggleUserPopup) {
    window.psmVueApp.toggleUserPopup();
    return;
  }

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

function closeUserPopup(source = 'legacy') {
  if (source !== 'vue' && window.psmVueApp?.closeUserPopup) {
    window.psmVueApp.closeUserPopup();
    return;
  }

  const popup = $('user-popup');
  const button = $('user-btn');

  if (popup) popup.classList.remove('open');
  if (button) button.classList.remove('open');
}

function positionUserPopup(source = 'legacy') {
  if (source !== 'vue' && window.psmVueApp?.positionUserPopup) {
    window.psmVueApp.positionUserPopup();
    return;
  }

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
  if (window.psmVueApp) return;

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
  if (window.psmVueApp) return;

  const popup = $('user-popup');
  if (popup && popup.classList.contains('open')) {
    positionUserPopup();
  }
});

window.addEventListener('popstate', (event) => {
  if (window.psmVueApp) return;

  const tabName = (event.state && event.state.tab)
    ? event.state.tab
    : getTabFromPath();
 
  const navLink = document.querySelector(`nav a[data-action="showTab"][data-tab="${tabName}"]`);
  showTab(tabName, navLink, false);  // false = don't push again
 
  // Re-run loaders that need fresh data
  if (tabName === 'history' && typeof loadHistory === 'function') loadHistory();
});
 
// ── On initial page load: activate correct tab from URL & set initial state ──
document.addEventListener('DOMContentLoaded', () => {
  if (window.psmVueApp) return;

  const tabName = getTabFromPath();
  const navLink = document.querySelector(`nav a[data-action="showTab"][data-tab="${tabName}"]`);
  showTab(tabName, navLink, false);
  // Replace so the initial entry also carries state for popstate
  history.replaceState({ tab: tabName }, '', window.location.pathname);
});
