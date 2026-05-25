<template>
  <div class="forecast-layout">
    <div class="card forecast-settings-card">
      <div class="forecast-settings-head">
        <div>
          <h3 class="section-title">⚙️ Einstellungen</h3>
          <p class="text-muted-history">
            Zeitraum und Thresholds für die Berechnung des besten Spritzfensters.
          </p>
        </div>
      </div>

      <div class="form-grid forecast-grid">
        <div class="field forecast-orte-field">
          <label>Orte auswählen</label>
          <div class="forecast-checkbox-toolbar">
            <button type="button" class="btn btn-sm btn-ghost" @click="selectAllOrte">Alle</button>
            <button type="button" class="btn btn-sm btn-ghost" @click="selectNoOrte">Keine</button>
          </div>
          <div id="forecast-orte" class="forecast-checkbox-list">
            <div v-if="isOrteLoading" class="empty">Orte werden geladen...</div>
            <div v-else-if="orteError" class="empty">{{ orteError }}</div>
            <div v-else-if="!orte.length" class="empty">Keine Orte vorhanden</div>
            <template v-else>
              <label
                v-for="ort in orte"
                :key="ort.id"
                class="forecast-checkbox-item"
              >
                <input
                  v-model="selectedOrtIds"
                  type="checkbox"
                  class="forecast-ort-checkbox"
                  :value="String(ort.id)"
                />
                <span>{{ getOrtName(ort) }}</span>
              </label>
            </template>
          </div>
        </div>

        <div class="field">
          <label>Zeitraum</label>
          <select id="forecast-range" v-model="range">
            <option value="today">Heute</option>
            <option value="24">Bis Morgen</option>
            <option value="48">Nächste 2 Tage</option>
            <option value="72">Nächste 3 Tage</option>
            <option value="96">Nächste 4 Tage</option>
            <option value="120">Nächste 5 Tage</option>
          </select>
        </div>

        <div class="field">
          <label>Min. Fensterdauer (h)</label>
          <input id="forecast-min-window-hours" v-model.number="minWindowHours" type="number" step="1" />
        </div>
      </div>

      <div class="forecast-actions">
        <button
          id="btn-forecast-calc"
          type="button"
          class="btn btn-primary"
          :disabled="isLoading"
          @click="calculateForecastWindow"
        >
          📈 Vorhersage berechnen
        </button>
      </div>
    </div>

    <div class="card forecast-result-card">
      <h3 class="section-title">🌤 Bestes Zeitfenster</h3>
      <div id="forecast-loading" class="forecast-info-box" :class="{ hidden: !isLoading }">Vorhersage wird geladen...</div>
      <div id="forecast-error" class="forecast-error-box" :class="{ hidden: !errorMessage }">{{ errorMessage }}</div>

      <div
        id="forecast-best-window"
        class="forecast-best-window"
        :class="{ hidden: !bestState, 'is-good': bestState?.type === 'best' }"
      >
        <template v-if="bestState?.type === 'empty'">
          <div class="forecast-best-title">Keine Vorhersage verfügbar</div>
          <div>Für die ausgewählten Orte konnten keine Ergebnisse geladen werden.</div>
        </template>

        <template v-else-if="bestState?.type === 'none'">
          <div class="forecast-best-title">Kein passendes Zeitfenster gefunden</div>
          <div>Für keinen der ausgewählten Orte wurde mit den aktuellen Thresholds ein geeignetes Spritzfenster erkannt.</div>
        </template>

        <template v-else-if="bestState?.type === 'best'">
          <div class="forecast-best-title">Bestes Zeitfenster über alle Orte</div>
          <div class="forecast-best-time">{{ formatForecastWindow(bestState.window.start, bestState.window.end) }}</div>
          <div><strong>Ort:</strong> {{ bestState.ortName }}</div>

          <div class="forecast-best-meta">
            <div class="forecast-meta-box">
              <div class="forecast-meta-label">Dauer</div>
              <div class="forecast-meta-value">{{ bestState.window.duration_hours }} h</div>
            </div>
            <div class="forecast-meta-box">
              <div class="forecast-meta-label">Score</div>
              <div class="forecast-meta-value">{{ bestState.window.avg_score }}</div>
            </div>
            <div class="forecast-meta-box">
              <div class="forecast-meta-label">Beginn</div>
              <div class="forecast-meta-value">{{ formatDateTime(bestState.window.start) }}</div>
            </div>
          </div>
        </template>
      </div>

      <div id="forecast-alt-wrap" :class="{ hidden: !alternativeItems.length }">
        <h4 class="section-title mt-1">Weitere Zeitfenster</h4>
        <div id="forecast-alt-list" class="forecast-alt-list">
          <div
            v-for="item in alternativeItems"
            :key="`${item.ort_id}-${item.error || item.ort_name}`"
            class="forecast-window-item"
          >
            <div class="forecast-window-title">{{ item.ort_name }}</div>
            <template v-if="item.error">
              <div>Fehler: <strong>{{ item.error }}</strong></div>
            </template>
            <template v-else-if="!item.best_window">
              <div>Kein passendes Zeitfenster gefunden.</div>
            </template>
            <template v-else>
              <div>{{ formatForecastWindow(item.best_window.start, item.best_window.end) }}</div>
              <div>
                Dauer: <strong>{{ item.best_window.duration_hours }} h</strong>
                · Score: <strong>{{ item.best_window.avg_score }}</strong>
              </div>
              <div v-if="item.alternatives.length" class="forecast-sublist">
                <div
                  v-for="(window, index) in item.alternatives"
                  :key="`${item.ort_id}-alt-${index}`"
                  class="forecast-subitem"
                >
                  Alt {{ index + 1 }}: {{ formatForecastWindow(window.start, window.end) }}
                  · <strong>{{ window.duration_hours }} h</strong>
                  · Score <strong>{{ window.avg_score }}</strong>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';

import { apiGet, apiPost } from '../app/api.js';

const settingDefaults = {
  forecast_default_max_wind_ms: 3.5,
  forecast_default_max_precip_mm: 0.0,
  forecast_default_min_temp_c: 8.0,
  forecast_default_max_temp_c: 25.0,
  forecast_default_min_humidity_pct: 50,
  forecast_default_dry_hours_after: 3,
  forecast_default_min_hour: 6,
  forecast_default_max_hour: 23,
  forecast_default_range_hours: 72,
};

export default {
  name: 'ForecastView',
  setup() {
    const orte = ref([]);
    const selectedOrtIds = ref([]);
    const range = ref('72');
    const minWindowHours = ref(2);
    const settings = ref({ ...settingDefaults });
    const isOrteLoading = ref(false);
    const orteError = ref('');
    const isLoading = ref(false);
    const errorMessage = ref('');
    const results = ref([]);

    const successfulResults = computed(() => results.value.filter(result => result.ok && result.data));
    const failedResults = computed(() => results.value.filter(result => !result.ok));

    const rankedResults = computed(() => successfulResults.value
      .map(result => ({
        ...result,
        best_window: result.data?.best_window || null,
        windows: Array.isArray(result.data?.windows) ? result.data.windows : [],
      }))
      .sort((a, b) => {
        const aScore = a.best_window?.avg_score ?? -Infinity;
        const bScore = b.best_window?.avg_score ?? -Infinity;
        return bScore - aScore;
      }));

    const bestState = computed(() => {
      if (!results.value.length) return null;
      if (!successfulResults.value.length) return { type: 'empty' };

      const best = rankedResults.value[0];
      if (!best?.best_window) return { type: 'none' };

      return {
        type: 'best',
        ortName: best.ort_name,
        window: best.best_window,
      };
    });

    const alternativeItems = computed(() => {
      if (!results.value.length) return [];

      return [
        ...rankedResults.value.map(result => ({
          ...result,
          alternatives: result.windows.slice(1, 3),
        })),
        ...failedResults.value,
      ];
    });

    async function loadSettings(applyRangeDefault = true) {
      try {
        const payload = await apiGet('/api/app/settings');
        const items = Array.isArray(payload) ? Object.fromEntries(payload.map(item => [item.key, item.value])) : {};
        settings.value = {
          ...settingDefaults,
          ...items,
        };
        if (applyRangeDefault) {
          range.value = String(settings.value.forecast_default_range_hours ?? 72);
        }
      } catch (error) {
        console.error('loadForecastSettings failed', error);
      }
    }

    async function loadOrte() {
      isOrteLoading.value = true;
      orteError.value = '';
      try {
        const items = await apiGet('/api/orte');
        orte.value = Array.isArray(items) ? items : [];
      } catch (error) {
        console.error('loadForecastOrte failed', error);
        orteError.value = 'Fehler beim Laden';
      } finally {
        isOrteLoading.value = false;
      }
    }

    function selectAllOrte() {
      selectedOrtIds.value = orte.value.map(ort => String(ort.id));
    }

    function selectNoOrte() {
      selectedOrtIds.value = [];
    }

    function getOrtName(ort) {
      return ort?.name || ort?.bezeichnung || `Ort ${ort?.id}`;
    }

    function getOrtNameById(id) {
      const ort = orte.value.find(item => String(item.id) === String(id));
      return getOrtName(ort || { id });
    }

    function getRangeHours() {
      if (range.value === 'today') {
        const now = new Date();
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const diffHours = Math.ceil((end - now) / (1000 * 60 * 60));
        return Math.max(1, diffHours);
      }

      return Number.parseInt(range.value, 10) || 72;
    }

    function toNumber(value, fallback) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function buildPayload() {
      return {
        hours: getRangeHours(),
        thresholds: {
          max_wind_ms: toNumber(settings.value.forecast_default_max_wind_ms, settingDefaults.forecast_default_max_wind_ms),
          max_precip_mm: toNumber(settings.value.forecast_default_max_precip_mm, settingDefaults.forecast_default_max_precip_mm),
          min_temp_c: toNumber(settings.value.forecast_default_min_temp_c, settingDefaults.forecast_default_min_temp_c),
          max_temp_c: toNumber(settings.value.forecast_default_max_temp_c, settingDefaults.forecast_default_max_temp_c),
          min_humidity_pct: toNumber(settings.value.forecast_default_min_humidity_pct, settingDefaults.forecast_default_min_humidity_pct),
          min_window_hours: Number.parseInt(minWindowHours.value || '2', 10),
          dry_hours_after: Number.parseInt(settings.value.forecast_default_dry_hours_after || settingDefaults.forecast_default_dry_hours_after, 10),
          min_hour: Number.parseInt(settings.value.forecast_default_min_hour || settingDefaults.forecast_default_min_hour, 10),
          max_hour: Number.parseInt(settings.value.forecast_default_max_hour || settingDefaults.forecast_default_max_hour, 10),
        },
      };
    }

    async function calculateForecastWindow() {
      if (!selectedOrtIds.value.length) {
        errorMessage.value = 'Bitte mindestens einen Ort auswählen.';
        return;
      }

      isLoading.value = true;
      errorMessage.value = '';
      results.value = [];

      try {
        await loadSettings(false);
        const payload = buildPayload();
        const nextResults = await Promise.all(
          selectedOrtIds.value.map(async (ortId) => {
            try {
              const result = await apiPost(`/api/orte/${ortId}/spray-window`, payload);
              return {
                ort_id: ortId,
                ort_name: getOrtNameById(ortId),
                ok: !result?.error,
                data: result,
              };
            } catch (error) {
              return {
                ort_id: ortId,
                ort_name: getOrtNameById(ortId),
                ok: false,
                error: error?.message || 'Fehler beim Laden',
              };
            }
          }),
        );

        results.value = nextResults;
      } catch (error) {
        console.error('calculateForecastWindow failed', error);
        errorMessage.value = error?.message || 'Fehler beim Laden der Vorhersage.';
      } finally {
        isLoading.value = false;
      }
    }

    function formatForecastWindow(start, end) {
      return `${formatDateTime(start)} – ${formatDateTime(end)}`;
    }

    function formatDateTime(value) {
      if (!value) return '-';

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;

      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    onMounted(() => {
      loadSettings();
      loadOrte();
    });

    return {
      alternativeItems,
      bestState,
      calculateForecastWindow,
      errorMessage,
      formatDateTime,
      formatForecastWindow,
      getOrtName,
      isLoading,
      isOrteLoading,
      minWindowHours,
      orte,
      orteError,
      range,
      selectAllOrte,
      selectNoOrte,
      selectedOrtIds,
    };
  },
};
</script>
