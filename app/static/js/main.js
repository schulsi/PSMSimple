document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Nur App-Seite laden, wenn alle Funktionen vorhanden sind
    if (typeof loadBetrieb === 'function') {
      if ($('exp-datum') && !$('exp-datum').value) {
        $('exp-datum').value = new Date().toISOString().split('T')[0];
      }

      await Promise.all([
        loadBetrieb(),
        loadPSM(),
        loadEinsatzorte(),
        loadKulturen(),
        loadSettings()
      ]);

      initPSMSearch();
    }
  } catch (err) {
    console.error(err);
    toast('❌ Fehler beim Laden der App');
  }
});

/* ── LOGOUT FUNKTION ── */
function logout() {
  // Create a hidden form and submit it via POST
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/logout';
  
  // Add CSRF token from meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]');
  if (csrfToken) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'csrf_token';
    input.value = csrfToken.content;
    form.appendChild(input);
  }
  
  document.body.appendChild(form);
  form.submit();
}

/* ── Zentraler data-action Dispatcher ── */
(function initActionDispatcher() {
  // Aktionen, die per click ausgelöst werden
  const CLICK_ACTIONS = new Set([
    'toggleMobileNav', 'closeMobileNav', 'toggleUserPopup',
    'saveBetrieb',
    'openPSMModal', 'savePSM', 'closeMapModal', 'confirmMapSelection',
    'openEinsatzortModal', 'saveEinsatzort', 'openMapModal',
    'openKulturModal', 'saveKultur',
    'previewJSON', 'exportSave', 'exportDownloadZip',
    'resetHistoryFilter', 'resetPSMHistoryFilter', 'resetFieldsHistoryFilter',
    'saveSettings', 'renameUser', 'saveBetriebWizard',
    'closeModal', 'logout',  'calculateForecastWindow', 'forecastSelectAllOrte', 'forecastSelectNoOrte',
    'loadInventoryMovements', 'loadInventoryMovements', 'saveInventoryMovement'
  ]);

  // Aktionen mit einem Argument aus data-tab, data-period, data-subtab oder data-panel
  const CLICK_ACTIONS_WITH_ARG = new Map([
    ['showTab',              el => [el.dataset.tab,    el]],
    ['showHistorySubTab',    el => [el.dataset.subtab, el]],
    ['quickSelectHistory',   el => [el.dataset.period]],
    ['quickSelectPSMHistory',el => [el.dataset.period]],
    ['quickSelectFieldsHistory', el => [el.dataset.period]],
    ['closeModal',           el => [el.dataset.modal]],
    ['editEinsatzort',         el => [el.dataset.id]],
    ['removeEinsatzort',       el => [el.dataset.id]],
    ['showHistoryDetail',         el => [el.dataset.id]],
    ['deleteHistoryEntry',       el => [el.dataset.id]],
    ['toggleFieldDetails',       el => [el.dataset.name, el]],
    ['editKultur',           el => [el.dataset.id]],
    ['removeKultur',         el => [el.dataset.id]],
    ['editPSM',              el => [el.dataset.id]],
    ['removePSM',            el => [el.dataset.id]],
    ['saveUserRole',         el => [el.dataset.id]],
    ['selectPSMSearchResult', el => [el.dataset.name, el.dataset.kennr]],
    ['openDeleteUserConfirm', el => [el.dataset.id, el.dataset.username]],
    ['showPanelAuth',        el => [el.dataset.panel]],
    ['openInventoryMovementModal', el => [el.dataset.id, el.dataset.name, el.dataset.einheit]],
    ['showInventorySubTab', el => [el.dataset.subtab, el]],
  ]);

  // Aktionen, die nach showTab zusätzlich aufgerufen werden (data-also)
  const ALSO_AFTER_SHOW_TAB = true;

  // Aktionen, die per change ausgelöst werden
  const CHANGE_ACTIONS = new Set([
    'updateArtSubkategorie', 'syncArtVerwendungField',
    'loadHistory', 'loadPSMUsage', 'loadFieldsUsage',
    'onSaveModeToggle', 'onWizSaveModeToggle', 'loadInventoryMovements',
  ]);

  // change-Aktionen mit type und id Parameter
  const CHANGE_ACTIONS_WITH_TYPE_ID = new Set([
    'toggleExpItem',
  ]);

  // change-Aktionen, die das Element als Argument brauchen
  const CHANGE_ACTIONS_WITH_EL = new Set([
    'onSaveModeToggle', 'onWizSaveModeToggle',
  ]);

  function dispatch(actionName, args = []) {
    const fn = window[actionName];
    if (typeof fn === 'function') {
      fn(...args);
    } else {
      console.warn(`[data-action] Funktion nicht gefunden: "${actionName}"`);
    }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    // Nav-Links: Standard-Navigation verhindern
    if (el.tagName === 'A' && el.href) {
      e.preventDefault();
    }

    if (CLICK_ACTIONS_WITH_ARG.has(action)) {
      const argsBuilder = CLICK_ACTIONS_WITH_ARG.get(action);
      dispatch(action, argsBuilder(el));

      // data-also: weitere Funktionen nach showTab aufrufen
      if (action === 'showTab' && ALSO_AFTER_SHOW_TAB && el.dataset.also) {
        el.dataset.also.split(',').forEach(fn => dispatch(fn.trim()));
      }
    } else if (CLICK_ACTIONS.has(action)) {
      dispatch(action);
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;
    if (!CHANGE_ACTIONS.has(action) && !CHANGE_ACTIONS_WITH_TYPE_ID.has(action)) return;

    if (CHANGE_ACTIONS_WITH_TYPE_ID.has(action)) {
      dispatch(action, [el.dataset.type, el.dataset.id]);
    } else {
      const args = CHANGE_ACTIONS_WITH_EL.has(action) ? [el] : [];
      dispatch(action, args);
    }
  });
})();