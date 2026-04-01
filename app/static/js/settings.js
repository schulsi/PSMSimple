let APP_PERMISSIONS = null;
async function loadSettings() {
  try {
    const me = await apiGet('/api/me');
    APP_PERMISSIONS = me.permissions || null;

    const settings = await apiGet('/api/user/settings');

    const browserDownload = $('set-browser-download');
    const localSave = $('set-local-save');
    const defaultAnwender = $('set-default-anwender');
    const defaultVerantwortlich = $('set-default-verantwortlich');
    const registrationAllowed = $('set-registration-allowed');

    if (registrationAllowed) {
      registrationAllowed.checked = !!settings.registration_allowed;
    }
    if (browserDownload) {
      browserDownload.checked = !!settings.browser_download;
    }

    if (localSave) {
      localSave.checked = !!settings.local_save;
    }

    if (defaultAnwender) {
      defaultAnwender.value = settings.default_anwender || '';
    }

    if (defaultVerantwortlich) {
      defaultVerantwortlich.value = settings.default_verantwortlich || '';
    }

    if (APP_PERMISSIONS?.can_manage_users) {
      await loadUserRoles();

    }

    applyDefaultSettingsToExport(settings);
  } catch (err) {
    console.error(err);
    toast('❌ Einstellungen konnten nicht geladen werden');
  }
}

function collectSettingsForm() {
  return {
    browser_download: $('set-browser-download') ? $('set-browser-download').checked : true,
    local_save: $('set-local-save') ? $('set-local-save').checked : true,
    default_anwender: $('set-default-anwender') ? $('set-default-anwender').value.trim() : '',
    default_verantwortlich: $('set-default-verantwortlich') ? $('set-default-verantwortlich').value.trim() : ''
  };
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

    const payloadApp = collectAppSettings();
    await apiPost('/api/app/settings', payloadApp);
    
    applyDefaultSettingsToExport(result.settings || payload);
    toast('✅ Einstellungen gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function applyDefaultSettingsToExport(settings) {
  const anwenderInput = $('exp-anwender');
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
  if (!username) {
    toast('❌ Bitte einen Benutzernamen eingeben');
    return;
  }

  try {
    await apiPost('/api/user/rename', { username });

    const nameLabel = $('user-name-label');
    const popupUsername = $('popup-username');
    const avatar = $('user-avatar');

    if (nameLabel) nameLabel.textContent = username;
    if (popupUsername) popupUsername.textContent = username;
    if (avatar) avatar.textContent = username.charAt(0).toUpperCase();

    input.value = '';
    input.placeholder = username;

    toast('✅ Benutzername geändert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}


async function loadUserRoles() {
  const wrap = document.getElementById('user-role-list');
  if (!wrap) return;

  try {
    const users = await apiGet('/api/users');

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

          <button type="button" class="btn btn-primary" style="width:auto" onclick="saveUserRole(${user.id})">
            Speichern
          </button>

          <button 
            type="button"
            class="btn btn-danger"
            style="width:auto"
            onclick="openDeleteUserConfirm(${user.id}, '${escapeJs(user.username)}')"
            ${user.is_current_user ? 'disabled' : ''}
          >
            Löschen
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<div style="color:#b00020">Benutzer konnten nicht geladen werden.</div>';
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
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeJs(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}