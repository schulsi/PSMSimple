<template>
  <h2>⚙️ Einstellungen</h2>

  <div class="sub-tabs">
    <button
      v-for="tab in settingsTabs"
      :key="tab.id"
      type="button"
      class="sub-tab-btn"
      :class="{ active: activeSettingsTab === tab.id }"
      @click="activeSettingsTab = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>

  <div class="history-sub-tab" :class="{ active: activeSettingsTab === 'general' }">
    <div class="card">
      <h3 class="section-title">📁 Export-Verhalten</h3>
      <div class="settings-row">
        <span id="lbl-browser-download" class="upper-label" :class="localSave ? 'label-muted' : 'label-inherit'">Browser-Download</span>
        <label class="save-toggle" title="Umschalten zwischen Browser-Download und lokalem Speichern">
          <input id="save-mode-toggle" v-model="localSave" type="checkbox" @change="syncSaveMode" />
          <span class="save-toggle-track"></span>
        </label>
        <span id="lbl-local-save" class="upper-label" :class="localSave ? 'label-inherit' : 'label-muted'">Lokal speichern</span>
      </div>
      <div id="save-mode-desc" class="text-muted-sm mt-05">{{ saveModeDescription }}</div>
    </div>

    <div class="card">
      <h3 class="section-title">👤 Standard-Felder</h3>
      <div class="form-grid maxw-600">
        <div class="field">
          <label>Standard-Anwender</label>
          <input id="set-default-anwender" v-model="userSettings.default_anwender" placeholder="Wird automatisch in Anwendung eingetragen" />
        </div>
        <div class="field">
          <label>Standard-Verantwortliche/r</label>
          <input id="set-default-verantwortlich" v-model="userSettings.default_verantwortlich" placeholder="Wird automatisch in Anwendung eingetragen" />
        </div>
      </div>
    </div>

  </div>

  <div class="history-sub-tab" :class="{ active: activeSettingsTab === 'users' }">
    <div v-if="auth.oidc_enabled" class="card">
      <h3 class="section-title">🔐 Benutzerkonto</h3>
      <div class="settings-stack">
        <div class="settings-row-wrap">
          <div>
            <div class="settings-info-title">{{ auth.oidc_provider_name }}-Konto</div>
            <div class="settings-info-sub">
              {{ auth.oidc_linked
                ? 'Dieses Benutzerkonto ist bereits mit SSO verknüpft.'
                : 'Verknüpfe dein Benutzerkonto, um dich künftig per SSO anzumelden.' }}
            </div>
          </div>
          <button v-if="auth.oidc_linked" type="button" class="btn btn-auto-width" disabled>
            Bereits verknüpft
          </button>
          <a v-else class="btn btn-primary btn-auto-width" href="/auth/oidc/link">
            Account verknüpfen
          </a>
        </div>
      </div>
    </div>

    <div v-if="canManageUsers" class="card">
      <h3 class="section-title">📁 Globale Einstellungen</h3>
      <div class="settings-stack">
        <label class="settings-row-wrap">
          <input id="set-registration-allowed" v-model="appSettings.registration_allowed" type="checkbox" class="inline-accent-checkbox" />
          <div>
            <div class="settings-info-title">Registration erlauben</div>
            <div class="settings-info-sub">Ermöglicht es neuen Benutzern, sich zu registrieren</div>
          </div>
        </label>
      </div>
    </div>

    <div v-if="canManageUsers" class="card">
      <h3 class="section-title">👥 Benutzerverwaltung</h3>
      <div id="user-role-list" class="settings-stack">
        <div v-if="isUsersLoading" class="user-item-empty">Benutzer werden geladen...</div>
        <div v-else-if="!users.length" class="user-item-empty">Keine Benutzer vorhanden.</div>
        <div v-for="user in users" v-else :key="user.id" class="user-item">
          <div class="user-item-info">
            <div>{{ user.username }}</div>
            <div class="user-item-meta">ID: {{ user.id }}</div>
            <div class="user-item-meta">Rolle: {{ user.role }}</div>
          </div>
          <div class="user-item-actions">
            <select :id="`role-user-${user.id}`" v-model="user.role">
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="read-only">Read-only</option>
            </select>
            <button type="button" class="btn btn-primary btn-auto-width" @click="saveUserRole(user)">Speichern</button>
            <button
              type="button"
              class="btn btn-danger btn-auto-width"
              :disabled="user.is_current_user"
              @click="confirmDeleteUser(user)"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3 class="section-title">👤 Benutzername ändern</h3>
      <div class="popup-rename">
        <label>Benutzername ändern</label>
        <div class="popup-rename-row">
          <input id="rename-input" v-model="renameInput" type="text" :placeholder="username" />
          <button type="button" @click="renameUser">Speichern</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h3 class="section-title">Einstellungen sichern</h3>
      <p class="text-muted-history">
        Exportiert oder importiert die globalen Anwendungseinstellungen als JSON-Datei.
        Benutzerkonten und persönliche Einstellungen sind nicht enthalten.
      </p>
      <div class="rename-row">
        <button type="button" class="btn btn-primary" @click="exportSettingsBackup">
          Backup herunterladen
        </button>
        <label class="btn btn-auto-width">
          Backup einspielen
          <input type="file" accept="application/json,.json" hidden @change="importSettingsBackup" />
        </label>
      </div>
    </div>
  </div>

  <div v-if="canManageUsers" class="history-sub-tab" :class="{ active: activeSettingsTab === 'advice' }">
    <div class="card">
      <h3 class="section-title">🌿 PSM-Beratung</h3>
      <label class="settings-row-wrap">
        <input id="set-ai-advice-enabled" v-model="appSettings.aiEnabled" type="checkbox" class="inline-accent-checkbox" />
        <div>
          <div class="settings-info-title">AI-Beratung aktivieren</div>
          <div class="settings-info-sub">Schaltet nur die AI-Empfehlung in der PSM-Beratung ein</div>
        </div>
      </label>
      <p class="text-muted-history">
        Schadorganismus-Kodes die beim App-Start vorgeladen werden (BVL-Kodes, kommagetrennt).
        Änderungen werden beim nächsten Neustart aktiv.
      </p>
      <div class="field">
        <label>Warmup Schadorganismen</label>
        <input id="set-warmup-schadorg" v-model="warmupSchadorg" placeholder="Mehltau, Blattlaus, Rost, Botrytis..." />
      </div>
    </div>
  </div>

  <div v-if="canManageUsers" class="history-sub-tab" :class="{ active: activeSettingsTab === 'forecast' }">
    <div class="card">
      <h3 class="section-title">🌦️ Vorhersage-Standardwerte</h3>
      <div class="form-grid maxw-600">
        <div class="field">
          <label>Max. Wind (m/s)</label>
          <input id="set-forecast-max-wind" v-model.number="appSettings.forecast_default_max_wind_ms" type="number" step="0.1" />
        </div>
        <div class="field">
          <label>Max. Niederschlag (mm)</label>
          <input id="set-forecast-max-precip" v-model.number="appSettings.forecast_default_max_precip_mm" type="number" step="0.1" />
        </div>
        <div class="field">
          <label>Min. Temperatur (°C)</label>
          <input id="set-forecast-min-temp" v-model.number="appSettings.forecast_default_min_temp_c" type="number" step="0.1" />
        </div>
        <div class="field">
          <label>Max. Temperatur (°C)</label>
          <input id="set-forecast-max-temp" v-model.number="appSettings.forecast_default_max_temp_c" type="number" step="0.1" />
        </div>
        <div class="field">
          <label>Min. Luftfeuchte (%)</label>
          <input id="set-forecast-min-humidity" v-model.number="appSettings.forecast_default_min_humidity_pct" type="number" step="1" />
        </div>
        <div class="field">
          <label>Trocken danach (h)</label>
          <input id="set-forecast-dry-hours-after" v-model.number="appSettings.forecast_default_dry_hours_after" type="number" step="1" />
        </div>
        <div class="field">
          <label>Früheste Uhrzeit</label>
          <input id="set-forecast-min-hour" v-model.number="appSettings.forecast_default_min_hour" type="number" min="0" max="23" />
        </div>
        <div class="field">
          <label>Späteste Uhrzeit</label>
          <input id="set-forecast-max-hour" v-model.number="appSettings.forecast_default_max_hour" type="number" min="0" max="23" />
        </div>
        <div class="field">
          <label>Standard-Zeitraum (Stunden)</label>
          <input id="set-forecast-range-hours" v-model.number="appSettings.forecast_default_range_hours" type="number" step="1" />
        </div>
      </div>
    </div>
  </div>

  <div v-if="canManageUsers" class="history-sub-tab" :class="{ active: activeSettingsTab === 'inventory' }">
    <div class="card">
      <h3 class="section-title">📦 Lager-Standardwerte</h3>
      <div class="form-grid maxw-600">
        <div class="field">
          <label>Anzahl für Warnung</label>
          <input id="set-lager-warn" v-model.number="appSettings.inventory_warn_default" type="number" step="0.1" />
        </div>
        <div class="field">
          <label>Min Anzahl</label>
          <input id="set-lager-min" v-model.number="appSettings.inventory_min_default" type="number" step="0.1" />
        </div>
      </div>
    </div>
  </div>

  <div class="rename-row">
    <button type="button" class="btn btn-primary" :disabled="isSaving" @click="saveSettings">
      {{ isSaving ? 'Speichert...' : '💾 Einstellungen speichern' }}
    </button>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import {
  applyDefaultSettingsToExport,
  registerSettingsView,
  toast,
  updateExportButtons,
} from '../app/appBridge.js';
import { apiDelete, apiGet, apiPost, apiPut } from '../app/api.js';

const appDefaults = {
  registration_allowed: false,
  forecast_default_max_wind_ms: 3.5,
  forecast_default_max_precip_mm: 0.0,
  forecast_default_min_temp_c: 8.0,
  forecast_default_max_temp_c: 25.0,
  forecast_default_min_humidity_pct: 50,
  forecast_default_dry_hours_after: 3,
  forecast_default_min_hour: 6,
  forecast_default_max_hour: 23,
  forecast_default_range_hours: 72,
  inventory_warn_default: 2,
  inventory_min_default: 2,
  aiEnabled: false,
};

export default {
  name: 'SettingsView',
  props: {
    auth: {
      type: Object,
      default: () => ({}),
    },
    initialUsername: {
      type: String,
      default: '',
    },
    permissions: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['rename-user', 'settings-saved', 'switch-forecast-sub-tab'],
  setup(props, { emit }) {
    const username = ref(props.initialUsername);
    const renameInput = ref('');
    const localSave = ref(true);
    const users = ref([]);
    const warmupSchadorg = ref('');
    const isSaving = ref(false);
    const isUsersLoading = ref(false);
    const activeSettingsTab = ref('general');
    let unregisterSettingsView = null;
    const userSettings = reactive({
      default_anwender: '',
      default_verantwortlich: '',
    });
    const appSettings = reactive({ ...appDefaults });
    const canManageUsers = computed(() => !!props.permissions?.can_manage_users);
    const settingsTabs = computed(() => {
      const tabs = [
        { id: 'general', label: 'Allgemein' },
        { id: 'users', label: 'Admin & Benutzer' },
      ];

      if (canManageUsers.value) {
        tabs.push(
          { id: 'advice', label: 'Beratung' },
          { id: 'forecast', label: 'Vorhersage' },
          { id: 'inventory', label: 'Lager' },
        );
      }

      return tabs;
    });
    const saveModeDescription = computed(() => (
      localSave.value
        ? 'Datei wird auf dem Server im Exportordner abgelegt'
        : 'Datei wird als ZIP (JSON + PDF) direkt im Browser heruntergeladen'
    ));

    async function loadSettings() {
      try {
        const settings = await apiGet('/api/user/settings');
        localSave.value = settings.local_save !== undefined ? !!settings.local_save : true;
        userSettings.default_anwender = settings.default_anwender || '';
        userSettings.default_verantwortlich = settings.default_verantwortlich || '';
        syncSaveMode();
        applyExportDefaults(settings);

        if (canManageUsers.value) {
          await loadAppSettings();
          await loadUserRoles();
        }
      } catch (error) {
        console.error('[loadSettings] Fehler:', error);
        toast('❌ Einstellungen konnten nicht geladen werden');
      }
    }

    async function loadAppSettings() {
      const payload = await apiGet('/api/app/settings');
      const items = Array.isArray(payload)
        ? Object.fromEntries(payload.map(item => [item.key, item.value]))
        : (payload && typeof payload === 'object' ? payload : {});

      Object.assign(appSettings, {
        ...appDefaults,
        ...items,
        registration_allowed: items.registration_allowed === '1' || items.registration_allowed === true,
        aiEnabled: items.aiEnabled === '1' || items.aiEnabled === true,
      });

      try {
        const parsed = items.beratung_warmup_suchwörter ? JSON.parse(items.beratung_warmup_suchwörter) : [];
        warmupSchadorg.value = Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        warmupSchadorg.value = '';
      }

    }

    async function loadUserRoles() {
      isUsersLoading.value = true;
      try {
        const payload = await apiGet('/api/users');
        users.value = Array.isArray(payload) ? payload : [];
      } catch (error) {
        console.error('[loadUserRoles] Fehler beim Laden:', error);
        toast(`❌ Benutzer konnten nicht geladen werden: ${error.message || 'Unbekannter Fehler'}`);
      } finally {
        isUsersLoading.value = false;
      }
    }

    function collectUserSettings() {
      return {
        browser_download: !localSave.value,
        local_save: localSave.value,
        default_anwender: userSettings.default_anwender.trim(),
        default_verantwortlich: userSettings.default_verantwortlich.trim(),
      };
    }

    function collectAppSettings() {
      return {
        registration_allowed: appSettings.registration_allowed ? '1' : '0',
        forecast_default_max_wind_ms: Number(appSettings.forecast_default_max_wind_ms || 3.5),
        forecast_default_max_precip_mm: Number(appSettings.forecast_default_max_precip_mm || 0.0),
        forecast_default_min_temp_c: Number(appSettings.forecast_default_min_temp_c || 8),
        forecast_default_max_temp_c: Number(appSettings.forecast_default_max_temp_c || 25),
        forecast_default_min_humidity_pct: Number.parseInt(appSettings.forecast_default_min_humidity_pct || 50, 10),
        forecast_default_dry_hours_after: Number.parseInt(appSettings.forecast_default_dry_hours_after || 3, 10),
        forecast_default_min_hour: Number.parseInt(appSettings.forecast_default_min_hour || 6, 10),
        forecast_default_max_hour: Number.parseInt(appSettings.forecast_default_max_hour || 23, 10),
        forecast_default_range_hours: Number.parseInt(appSettings.forecast_default_range_hours || 72, 10),
        inventory_warn_default: Number.parseInt(appSettings.inventory_warn_default || 2, 10),
        inventory_min_default: Number.parseInt(appSettings.inventory_min_default || 2, 10),
        aiEnabled: appSettings.aiEnabled ? '1' : '0',
        beratung_warmup_suchwörter: JSON.stringify(
          warmupSchadorg.value
            .split(',')
            .map(word => word.trim())
            .filter(Boolean),
        ),
      };
    }

    async function saveSettings() {
      const payloadUser = collectUserSettings();
      const payloadApp = collectAppSettings();

      if (payloadApp.forecast_default_min_hour < 0 || payloadApp.forecast_default_min_hour > 23) {
        toast('❌ Früheste Uhrzeit muss zwischen 0 und 23 liegen');
        return;
      }

      if (payloadApp.forecast_default_max_hour < 0 || payloadApp.forecast_default_max_hour > 23) {
        toast('❌ Späteste Uhrzeit muss zwischen 0 und 23 liegen');
        return;
      }

      isSaving.value = true;
      try {
        const resultUser = await apiPost('/api/user/settings', payloadUser);
        let resultApp = { settings: payloadApp };
        if (canManageUsers.value) {
          resultApp = await apiPost('/api/app/settings', payloadApp);
        }

        applyExportDefaults(resultUser.settings || payloadUser);
        syncSaveMode();
        emit('settings-saved', resultApp.settings || payloadApp);
        toast('✅ Einstellungen gespeichert');
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isSaving.value = false;
      }
    }

    async function renameUser() {
      const nextUsername = renameInput.value.trim();
      if (!nextUsername) {
        toast('❌ Bitte einen Benutzernamen eingeben');
        return;
      }

      try {
        await apiPost('/api/user/rename', { username: nextUsername });
        username.value = nextUsername;
        renameInput.value = '';
        emit('rename-user', nextUsername);
        toast('✅ Benutzername geändert');
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      }
    }

    async function saveUserRole(user) {
      try {
        const result = await apiPut(`/api/users/${user.id}/role`, { role: user.role });
        if (result?.user) {
          users.value = users.value.map(item => (item.id === user.id ? result.user : item));
        }
        toast('✅ Rolle gespeichert');
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      }
    }

    async function confirmDeleteUser(user) {
      const confirmed = window.confirm(
        `Möchtest du den Benutzer "${user.username}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      );
      if (!confirmed) return;

      try {
        await apiDelete(`/api/users/${user.id}`);
        toast('✅ Benutzer gelöscht');
        await loadUserRoles();
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      }
    }

    async function exportSettingsBackup() {
      try {
        const backup = await apiGet('/api/app/settings/backup');
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `psmsimple-settings-${date}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast('✅ Einstellungen exportiert');
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      }
    }

    async function importSettingsBackup(event) {
      const input = event.target;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;

      try {
        const backup = JSON.parse(await file.text());
        const confirmed = window.confirm(
          'Möchtest du die globalen Einstellungen wirklich aus diesem Backup wiederherstellen?',
        );
        if (!confirmed) return;

        await apiPost('/api/app/settings/backup', backup);
        await loadAppSettings();
        toast('✅ Einstellungen wiederhergestellt');
      } catch (error) {
        console.error(error);
        const message = error instanceof SyntaxError ? 'Die Datei enthält kein gültiges JSON.' : error.message;
        toast(`❌ ${message}`);
      }
    }

    function syncSaveMode() {
      updateExportButtons(localSave.value);
    }

    function applyExportDefaults(settings) {
      applyDefaultSettingsToExport(settings);
    }

    function installSettingsBridge() {
      unregisterSettingsView = registerSettingsView({
        applyUserSettings(settings = {}) {
          localSave.value = settings.local_save !== undefined ? !!settings.local_save : localSave.value;
          userSettings.default_anwender = settings.default_anwender || userSettings.default_anwender;
          userSettings.default_verantwortlich = settings.default_verantwortlich || userSettings.default_verantwortlich;
          syncSaveMode();
        },
      });
    }

    onMounted(() => {
      installSettingsBridge();
      loadSettings();
    });

    onBeforeUnmount(() => {
      unregisterSettingsView?.();
    });

    return {
      activeSettingsTab,
      appSettings,
      canManageUsers,
      confirmDeleteUser,
      exportSettingsBackup,
      importSettingsBackup,
      isSaving,
      isUsersLoading,
      localSave,
      renameInput,
      renameUser,
      saveModeDescription,
      saveSettings,
      saveUserRole,
      settingsTabs,
      syncSaveMode,
      userSettings,
      username,
      users,
      warmupSchadorg,
    };
  },
};
</script>
