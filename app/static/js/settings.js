// ── Save-mode helpers ─────────────────────────────────────────────────────────
// "local save" = toggle checked (true)  →  local_save=true,  browser_download=false
// "browser download" = toggle unchecked (false) →  local_save=false, browser_download=true

function isLocalSaveMode() {
  const toggle = $('save-mode-toggle');
  if (toggle) return toggle.checked;
  return true;
}

function updateSaveModeLabels(localSave) {
  const lblBrowser = $('lbl-browser-download');
  const lblLocal   = $('lbl-local-save');
  const desc       = $('save-mode-desc');
  if (lblBrowser) lblBrowser.style.color = localSave ? 'var(--text-muted)' : 'inherit';
  if (lblLocal)   lblLocal.style.color   = localSave ? 'inherit' : 'var(--text-muted)';
  if (desc) {
    desc.textContent = localSave
      ? 'Datei wird auf dem Server im Exportordner abgelegt'
      : 'Datei wird als ZIP (JSON + PDF) direkt im Browser heruntergeladen';
  }
}

function onSaveModeToggle(checkbox) {
  updateSaveModeLabels(checkbox.checked);
  updateExportButtons(checkbox.checked);
}

function updateWizSaveModeLabels(localSave) {
  const lblBrowser = $('wiz-lbl-browser');
  const lblLocal   = $('wiz-lbl-local');
  const desc       = $('wiz-save-mode-desc');
  if (lblBrowser) lblBrowser.style.color = localSave ? 'var(--text-muted)' : 'inherit';
  if (lblLocal)   lblLocal.style.color   = localSave ? 'inherit' : 'var(--text-muted)';
  if (desc) {
    desc.textContent = localSave
      ? 'Datei wird auf dem Server im Exportordner abgelegt'
      : 'Datei wird als ZIP (JSON + PDF) direkt im Browser heruntergeladen';
  }
}

function onWizSaveModeToggle(checkbox) {
  updateWizSaveModeLabels(checkbox.checked);
}

function updateExportButtons(localSave) {
  const btnSave     = $('btn-save');
  const btnDownload = $('btn-download');
  if (btnSave)     btnSave.style.display     = localSave ? '' : 'none';
  if (btnDownload) btnDownload.style.display = localSave ? 'none' : '';
}

// ── Settings load / save ──────────────────────────────────────────────────────

async function loadSettings() {
  try {
    const settings = await apiGet('/api/user/settings');

    const toggle                = $('save-mode-toggle');
    const defaultAnwender       = $('set-default-anwender');
    const defaultVerantwortlich = $('set-default-verantwortlich');
    const registrationAllowed   = $('set-registration-allowed');

    if (registrationAllowed) {
      registrationAllowed.checked = !!settings.registration_allowed;
    }

    const localSave = settings.local_save !== undefined ? !!settings.local_save : true;

    if (toggle) {
      toggle.checked = localSave;
      updateSaveModeLabels(localSave);
    }

    updateExportButtons(localSave);
    if (defaultAnwender)       defaultAnwender.value       = settings.default_anwender       || '';
    if (defaultVerantwortlich) defaultVerantwortlich.value = settings.default_verantwortlich || '';

    applyDefaultSettingsToExport(settings);
  } catch (err) {
    console.error(err);
    toast('❌ Einstellungen konnten nicht geladen werden');
  }
}

function collectSettingsForm() {
  const toggle    = $('save-mode-toggle');
  const localSave = toggle ? toggle.checked : true;
  return {
    browser_download:       !localSave,
    local_save:              localSave,
    default_anwender:       $('set-default-anwender')       ? $('set-default-anwender').value.trim()       : '',
    default_verantwortlich: $('set-default-verantwortlich') ? $('set-default-verantwortlich').value.trim() : ''
  };
}

function collectWizardSaveMode() {
  const wizToggle = $('wiz-save-mode-toggle');
  const localSave = wizToggle ? wizToggle.checked : true;
  return { browser_download: !localSave, local_save: localSave };
}

function collectAppSettings() {
  return {
    registration_allowed: $('set-registration-allowed') ? $('set-registration-allowed').checked : true
  };
}

async function saveSettings() {
  try {
    const payload    = collectSettingsForm();
    const result     = await apiPost('/api/user/settings', payload);
    const payloadApp = collectAppSettings();
    await apiPost('/api/app/settings', payloadApp);
    applyDefaultSettingsToExport(result.settings || payload);
    updateExportButtons(payload.local_save);
    toast('✅ Einstellungen gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function applyDefaultSettingsToExport(settings) {
  const anwenderInput       = $('exp-anwender');
  const verantwortlichInput = $('exp-verantwortlich');
  if (anwenderInput && !anwenderInput.value.trim() && settings.default_anwender) {
    anwenderInput.value = settings.default_anwender;
  }
  if (verantwortlichInput && !verantwortlichInput.value.trim() && settings.default_verantwortlich) {
    verantwortlichInput.value = settings.default_verantwortlich;
  }
}

async function renameUser() {
  const input = $('rename-input');
  if (!input) return;
  const username = input.value.trim();
  if (!username) { toast('❌ Bitte einen Benutzernamen eingeben'); return; }
  try {
    await apiPost('/api/user/rename', { username });
    const nameLabel     = $('user-name-label');
    const popupUsername = $('popup-username');
    const avatar        = $('user-avatar');
    if (nameLabel)     nameLabel.textContent     = username;
    if (popupUsername) popupUsername.textContent = username;
    if (avatar)        avatar.textContent        = username.charAt(0).toUpperCase();
    input.value       = '';
    input.placeholder = username;
    toast('✅ Benutzername geändert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}
