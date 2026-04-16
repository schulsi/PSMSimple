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
let APP_PERMISSIONS = null;
async function loadSettings() {
  try {
    const me = await apiGet('/api/me');
    APP_PERMISSIONS = me.permissions || null;
    console.log('[loadSettings] Berechtigungen gesetzt:', APP_PERMISSIONS);

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

    if (APP_PERMISSIONS?.can_manage_users) {
      console.log('[loadSettings] Benutzer können verwaltet werden, lade Benutzerliste...');
      await loadUserRoles();
    } else {
      console.log('[loadSettings] Keine Berechtigung für Benutzerverwaltung');
    }

    applyDefaultSettingsToExport(settings);
  } catch (err) {
    console.error('[loadSettings] Fehler:', err);
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
    const payload = collectSettingsForm();
    const result = await apiPost('/api/user/settings', payload);

    const registrationAllowed = $('set-registration-allowed');
    if (registrationAllowed) {
      const payloadApp = collectAppSettings();
      await apiPost('/api/app/settings', payloadApp);
    }
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


async function loadUserRoles() {
  const wrap = document.getElementById('user-role-list');
  if (!wrap) {
    console.warn('[loadUserRoles] Element mit ID "user-role-list" nicht gefunden');
    return;
  }

  try {
    const users = await apiGet('/api/users');
    console.log('[loadUserRoles] Benutzer geladen:', users);

    if (!Array.isArray(users) || users.length === 0) {
      wrap.innerHTML = '<div style="color:#999">Keine Benutzer vorhanden.</div>';
      return;
    }

    wrap.innerHTML = users.map(user => `
      <div class="item-row" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.75rem;padding:.75rem;border:1px solid #ddd;border-radius:.5rem">
        <div>
          <div style="font-weight:600">${escapeHtml(user.username)}</div>
          <div style="font-size:.8rem;color:#666">ID: ${user.id}</div>
          <div style="font-size:.8rem;color:#666">Rolle: ${user.role}</div>
        </div>

        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <select id="role-user-${user.id}">
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
            <option value="read-only" ${user.role === 'read-only' ? 'selected' : ''}>Read-only</option>
          </select>

          <button type="button" class="btn btn-primary" style="width:auto" data-action="saveUserRole" data-id="${user.id}">
            Speichern
          </button>

          <button 
            type="button"
            class="btn btn-danger"
            style="width:auto"
            data-action="openDeleteUserConfirm" data-id="${user.id}" data-username="${escapeJs(user.username)}"
            ${user.is_current_user ? 'disabled' : ''}
          >
            Löschen
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[loadUserRoles] Fehler beim Laden:', err);
    wrap.innerHTML = '<div style="color:#b00020">❌ Benutzer konnten nicht geladen werden: ' + (err.message || 'Unbekannter Fehler') + '</div>';
  }
}
async function saveUserRole(userId) {
  const select = document.getElementById(`role-user-${userId}`);
  if (!select) return;

  try {
    await apiPut(`/api/users/${userId}/role`, { role: select.value });
    toast('✅ Rolle gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function openDeleteUserConfirm(userId, username) {
  const confirmed = window.confirm(
    `Möchtest du den Benutzer "${username}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
  );

  if (!confirmed) return;
  deleteUser(userId);
}

async function deleteUser(userId) {
  try {
    await apiDelete(`/api/users/${userId}`);
    toast('✅ Benutzer gelöscht');
    await loadUserRoles();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function escapeJs(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}