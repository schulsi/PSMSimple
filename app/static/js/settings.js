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
  if (lblBrowser) {
    lblBrowser.classList.toggle('label-muted', localSave);
    lblBrowser.classList.toggle('label-inherit', !localSave);
  }
  if (lblLocal) {
    lblLocal.classList.toggle('label-inherit', localSave);
    lblLocal.classList.toggle('label-muted', !localSave);
  }
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
  if (lblBrowser) {
    lblBrowser.classList.toggle('label-muted', localSave);
    lblBrowser.classList.toggle('label-inherit', !localSave);
  }
  if (lblLocal) {
    lblLocal.classList.toggle('label-inherit', localSave);
    lblLocal.classList.toggle('label-muted', !localSave);
  }
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
  if (btnSave) {
    if (localSave) {
      btnSave.classList.remove('hidden');
    } else {
      btnSave.classList.add('hidden');
    }
  }
  if (btnDownload) {
    if (localSave) {
      btnDownload.classList.add('hidden');
    } else {
      btnDownload.classList.remove('hidden');
    }
  }
}
let APP_PERMISSIONS = null;
async function loadSettings() {
  try {
    const me = await apiGet('/api/me');
    APP_PERMISSIONS = me.permissions || null;

    const settings = await apiGet('/api/user/settings');

     let appSettings = {};

    if (APP_PERMISSIONS?.can_manage_users) {
      try {
        appSettings = await apiGet('/api/app/settings');
        if (Array.isArray(appSettings)) {
          appSettings = Object.fromEntries(appSettings.map(s => [s.key, s.value]));
          }
      } catch (err) {
        console.warn('[loadSettings] Fehler beim Laden von App-Settings:', err);
        appSettings = {};
        
      }
    }

    const toggle                = $('save-mode-toggle');
    const defaultAnwender       = $('set-default-anwender');
    const defaultVerantwortlich = $('set-default-verantwortlich');
    const registrationAllowed   = $('set-registration-allowed');
    const forecastMaxWind        = $('set-forecast-max-wind');
    const forecastMaxPrecip      = $('set-forecast-max-precip');
    const forecastMinTemp        = $('set-forecast-min-temp');
    const forecastMaxTemp        = $('set-forecast-max-temp');
    const forecastMinHumidity    = $('set-forecast-min-humidity');
    const forecastDryHoursAfter  = $('set-forecast-dry-hours-after');
    const forecastMinHour        = $('set-forecast-min-hour');
    const forecastMaxHour        = $('set-forecast-max-hour');
    const forecastRangeHours     = $('set-forecast-range-hours');
    const lagerwarndefault       = $('set-lager-warn');
    const lagermindefault        = $('set-lager-min');    
    const warmupSchadorg         = $('set-warmup-schadorg');
    const aiEnabled              = $('set-ai-advice-enabled')

    const localSave = settings.local_save !== undefined ? !!settings.local_save : true;

    if (toggle) {
      toggle.checked = localSave;
      updateSaveModeLabels(localSave);
    }

    updateExportButtons(localSave);

    if (defaultAnwender) {
      defaultAnwender.value = settings.default_anwender || '';
    }

    if (defaultVerantwortlich) {
      defaultVerantwortlich.value = settings.default_verantwortlich || '';
    }

    if (registrationAllowed) {
      registrationAllowed.checked = !!appSettings.registration_allowed;
    }

    if (defaultAnwender)       defaultAnwender.value       = settings.default_anwender       || '';
    if (defaultVerantwortlich) defaultVerantwortlich.value = settings.default_verantwortlich || '';
    if (forecastMaxWind)        forecastMaxWind.value        = appSettings.forecast_default_max_wind_ms ?? 3.5;
    if (forecastMaxPrecip)      forecastMaxPrecip.value      = appSettings.forecast_default_max_precip_mm ?? 0.0;
    if (forecastMinTemp)        forecastMinTemp.value        = appSettings.forecast_default_min_temp_c ?? 8.0;
    if (forecastMaxTemp)        forecastMaxTemp.value        = appSettings.forecast_default_max_temp_c ?? 25.0;
    if (forecastMinHumidity)    forecastMinHumidity.value    = appSettings.forecast_default_min_humidity_pct ?? 50;
    if (forecastDryHoursAfter)  forecastDryHoursAfter.value  = appSettings.forecast_default_dry_hours_after ?? 3;
    if (forecastMinHour)        forecastMinHour.value        = appSettings.forecast_default_min_hour ?? 6;
    if (forecastMaxHour)        forecastMaxHour.value        = appSettings.forecast_default_max_hour ?? 23;
    if (forecastRangeHours)     forecastRangeHours.value     = appSettings.forecast_default_range_hours ?? 72;
    if (lagermindefault)        lagermindefault.value        = appSettings.inventory_min_default ?? 2;
    if (lagerwarndefault)       lagerwarndefault.value       = appSettings.inventory_warn_default ?? 2;
    if (aiEnabled)              aiEnabled.checked            = appSettings.aiEnabled === '1';
    if (warmupSchadorg) {
      const raw = appSettings.beratung_warmup_suchwörter;
      try {
          const list = raw ? JSON.parse(raw) : [];
          warmupSchadorg.value = Array.isArray(list) ? list.join(', ') : '';
      } catch {
          warmupSchadorg.value = '';
      }
    }
    if (APP_PERMISSIONS?.can_manage_users) {
      await loadUserRoles();
    }

    applyDefaultSettingsToExport(settings);
    applyDefaultSettingsToForecast(settings);
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
    registration_allowed: $('set-registration-allowed') ? ($('set-registration-allowed').checked ? "1" : "0") : "0",
    forecast_default_max_wind_ms: $('set-forecast-max-wind')
      ? parseFloat($('set-forecast-max-wind').value || '3.5')
      : 3.5,

    forecast_default_max_precip_mm: $('set-forecast-max-precip')
      ? parseFloat($('set-forecast-max-precip').value || '0.0')
      : 0.0,

    forecast_default_min_temp_c: $('set-forecast-min-temp')
      ? parseFloat($('set-forecast-min-temp').value || '8')
      : 8,

    forecast_default_max_temp_c: $('set-forecast-max-temp')
      ? parseFloat($('set-forecast-max-temp').value || '25')
      : 25,

    forecast_default_min_humidity_pct: $('set-forecast-min-humidity')
      ? parseInt($('set-forecast-min-humidity').value || '50', 10)
      : 50,

    forecast_default_dry_hours_after: $('set-forecast-dry-hours-after')
      ? parseInt($('set-forecast-dry-hours-after').value || '3', 10)
      : 3,

    forecast_default_min_hour: $('set-forecast-min-hour')
      ? parseInt($('set-forecast-min-hour').value || '6', 10)
      : 6,

    forecast_default_max_hour: $('set-forecast-max-hour')
      ? parseInt($('set-forecast-max-hour').value || '23', 10)
      : 23,

    forecast_default_range_hours: $('set-forecast-range-hours')
      ? parseInt($('set-forecast-range-hours').value || '72', 10)
      : 72,
    inventory_warn_default: $('set-lager-warn')
      ? parseInt($('set-lager-warn').value || '2', 10)
      : 2,
    inventory_min_default: $('set-lager-min')
      ? parseInt($('set-lager-min').value || '2', 10)
      : 2,
    aiEnabled: $('set-ai-advice-enabled')
      ? ($('set-ai-advice-enabled').checked ? '1': '0')
      : '0',
    beratung_warmup_suchwörter: (() => {
      const el = $('set-warmup-schadorg');
      if (!el) return '[]';
      const wörter = el.value
          .split(',')
          .map(w => w.trim())
          .filter(Boolean);
      return JSON.stringify(wörter);
    })(),
  };
}

async function saveSettings() {
  try {
    const payloadUser = collectSettingsForm();
    const resultUser = await apiPost('/api/user/settings', payloadUser);

    const payloadApp = collectAppSettings();
    const resultApp = await apiPost('/api/app/settings', payloadApp);
    
    if (payloadApp.forecast_default_min_hour < 0 || payloadApp.forecast_default_min_hour > 23) {
      toast('❌ Früheste Uhrzeit muss zwischen 0 und 23 liegen');
      return;
    }

    if (payloadApp.forecast_default_max_hour < 0 || payloadApp.forecast_default_max_hour > 23) {
      toast('❌ Späteste Uhrzeit muss zwischen 0 und 23 liegen');
      return;
    }

    
    applyDefaultSettingsToExport(resultUser.settings || payloadUser);
    applyDefaultSettingsToForecast(resultApp.settings || payloadApp);
    updateExportButtons(payloadUser.local_save);
    applyBeratungVisibility(payloadApp)

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
    if (!Array.isArray(users) || users.length === 0) {
      wrap.innerHTML = '<div class="user-item-empty">Keine Benutzer vorhanden.</div>';
      return;
    }

    wrap.innerHTML = users.map(user => `
      <div class="user-item">
        <div class="user-item-info">
          <div>${escapeHtml(user.username)}</div>
          <div class="user-item-meta">ID: ${user.id}</div>
          <div class="user-item-meta">Rolle: ${user.role}</div>
        </div>

        <div class="user-item-actions">
          <select id="role-user-${user.id}">
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
            <option value="read-only" ${user.role === 'read-only' ? 'selected' : ''}>Read-only</option>
          </select>

          <button type="button" class="btn btn-primary btn-auto-width" data-action="saveUserRole" data-id="${user.id}">
            Speichern
          </button>

          <button 
            type="button"
            class="btn btn-danger btn-auto-width"
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
    wrap.innerHTML = '<div class="user-item-error">❌ Benutzer konnten nicht geladen werden: ' + (err.message || 'Unbekannter Fehler') + '</div>';
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

function applyDefaultSettingsToForecast(settings) {
  const mappings = [
    ['forecast-max-wind', 'forecast_default_max_wind_ms', 3.5],
    ['forecast-max-precip', 'forecast_default_max_precip_mm', 0.0],
    ['forecast-min-temp', 'forecast_default_min_temp_c', 8.0],
    ['forecast-max-temp', 'forecast_default_max_temp_c', 25.0],
    ['forecast-min-humidity', 'forecast_default_min_humidity_pct', 50],
    ['forecast-dry-hours-after', 'forecast_default_dry_hours_after', 3],
    ['forecast-min-hour', 'forecast_default_min_hour', 6],
    ['forecast-max-hour', 'forecast_default_max_hour', 23],
  ];

  for (const [id, key, fallback] of mappings) {
    const el = $(id);
    if (el && !el.value) {
      el.value = settings[key] ?? fallback;
    }
  }

  const rangeEl = $('forecast-range');
  if (rangeEl && !rangeEl.value) {
    rangeEl.value = String(settings.forecast_default_range_hours ?? 72);
  }
}

function applyDefaultAppSettingsToForecast(appSettings) {
  const mappings = [
    ['forecast-max-wind', 'forecast_default_max_wind_ms', 3.5],
    ['forecast-max-precip', 'forecast_default_max_precip_mm', 0.0],
    ['forecast-min-temp', 'forecast_default_min_temp_c', 8.0],
    ['forecast-max-temp', 'forecast_default_max_temp_c', 25.0],
    ['forecast-min-humidity', 'forecast_default_min_humidity_pct', 50],
    ['forecast-dry-hours-after', 'forecast_default_dry_hours_after', 3],
    ['forecast-min-hour', 'forecast_default_min_hour', 6],
    ['forecast-max-hour', 'forecast_default_max_hour', 23],
  ];

  for (const [id, key, fallback] of mappings) {
    const el = $(id);
    if (el && !el.value) {
      el.value = appSettings[key] ?? fallback;
    }
  }

  const rangeEl = $('forecast-range');
  if (rangeEl && !rangeEl.value) {
    rangeEl.value = String(appSettings.forecast_default_range_hours ?? 72);
  }
}

function applyBeratungVisibility(appSettings) {
    const enabled = appSettings.aiEnabled === '1';

    const subTabBtn = document.querySelector(
        '[data-action="showForecastSubTab"][data-subtab="beratung"]'
    );
    const subTabPanel = document.getElementById('forecast-sub-beratung');

    if (subTabBtn) {
        subTabBtn.classList.toggle('hidden', !enabled);
        subTabBtn.style.setProperty('display', enabled ? '' : 'none', 'important');
    }
    if (subTabPanel) {
        subTabPanel.classList.toggle('hidden', !enabled);
        subTabPanel.style.setProperty('display', enabled ? '' : 'none', 'important');
    }

    if (!enabled && subTabPanel?.classList.contains('active')) {
        showForecastSubTab('spritzfenster',
            document.querySelector('[data-action="showForecastSubTab"][data-subtab="spritzfenster"]')
        );
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