<template>
  <div class="beratung-view">
    <div class="card mb-085">
      <h3 class="section-title">🌾 Kultur &amp; Schadorganismus</h3>
      <p class="text-muted-history">Wähle eine Kultur aus deiner Datenbank und suche nach dem Schadorganismus.</p>

      <div class="form-grid">
        <div class="field">
          <label>Kultur</label>
          <select id="beratung-kultur-select" v-model="selectedKulturId">
            <option value="">— Kultur wählen —</option>
            <option
              v-for="kultur in kulturen"
              :key="kultur.id"
              :value="String(kultur.id)"
            >
              {{ kultur.name }}{{ kultur.eppoCode ? ` (${kultur.eppoCode})` : '' }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Schadorganismus</label>
          <div class="beratung-search-wrap">
            <input
              id="beratung-schad-input"
              ref="schadInput"
              v-model="schadQuery"
              type="text"
              placeholder="z.B. Blattläuse, Mehltau..."
              autocomplete="off"
              @focus="openDropdown"
              @input="onSchadInput"
              @keydown.escape="closeDropdown"
            />
            <div
              id="beratung-schad-dropdown"
              class="beratung-dropdown"
              :class="{ hidden: !isDropdownOpen }"
            >
              <div v-if="isSearchLoading" class="beratung-dropdown-item beratung-dropdown-loading">Suche...</div>
              <div v-else-if="searchError" class="beratung-dropdown-item beratung-dropdown-empty">{{ searchError }}</div>
              <div v-else-if="!dropdownItems.length" class="beratung-dropdown-item beratung-dropdown-empty">
                {{ schadQuery.trim().length >= 2 ? 'Keine Treffer' : 'Mindestens 2 Zeichen eingeben' }}
              </div>
              <template v-else>
                <button
                  v-for="item in dropdownItems"
                  :key="item.kode"
                  type="button"
                  class="beratung-dropdown-item"
                  @mousedown.prevent="selectSchadorg(item)"
                >
                  <span class="beratung-dropdown-name">{{ item.bezeichnung }}</span>
                  <span class="beratung-dropdown-kode">{{ item.kode }}</span>
                </button>
              </template>
              <div v-if="isResolvingPartial" class="beratung-dropdown-item beratung-dropdown-loading">
                Weitere Ergebnisse werden geladen...
              </div>
            </div>
          </div>
          <input id="beratung-schad-kode" type="hidden" :value="selectedSchadorg?.kode || ''" />
          <div id="beratung-schad-selected" class="beratung-bubble-wrap">
            <span v-if="selectedSchadorg" class="beratung-bubble beratung-bubble-schad">
              {{ selectedSchadorg.bezeichnung }}
              <button type="button" class="beratung-bubble-remove" @click="clearSchadorg">✕</button>
            </span>
          </div>
        </div>

        <div class="field">
          <label>Feld (optional, für Wetterfenster)</label>
          <select id="beratung-ort-select" v-model="selectedOrtId">
            <option value="">— Kein Ort —</option>
            <option v-for="ort in orte" :key="ort.id" :value="String(ort.id)">
              {{ ort.name || ort.bezeichnung || `Ort ${ort.id}` }}
            </option>
          </select>
        </div>
      </div>

      <div class="mt-1">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="isLoadingMittel || isRecommendationLoading"
          :title="beratungButtonTitle"
          @click="startBeratung"
        >
          {{ beratungButtonText }}
        </button>
      </div>
    </div>

    <div id="beratung-mittel-wrap" :class="{ hidden: !showMittel }">
      <div class="card mb-085">
        <h3 class="section-title">🧪 Zugelassene Mittel <span id="beratung-mittel-count" class="badge">{{ mittel.length }}</span></h3>
        <p class="text-muted-history">Alle aktuell zugelassenen Mittel laut BVL für die gewählte Kombination.</p>
        <div v-if="isLoadingMittel || awgTotal > 0 || detailTotal > 0" class="beratung-progress-wrap">
          <div class="beratung-progress-meta">
            <span>Gefunden: <strong>{{ progressFound }}</strong></span>
            <span>Mittel geladen: <strong>{{ detailLoaded }}</strong><template v-if="detailTotal"> / {{ detailTotal }}</template></span>
          </div>
          <div class="beratung-progress-bar-track">
            <div class="beratung-progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <div class="beratung-progress-label">{{ progressLabel }}</div>
        </div>
        <div id="beratung-mittel-list" class="beratung-bubble-grid">
          <div v-if="isLoadingMittel && !mittel.length" class="empty">{{ emptyLoadingText }}</div>
          <div v-else-if="!mittel.length" class="empty">Keine zugelassenen Mittel gefunden.</div>
          <div
            v-for="item in mittel"
            :key="`${item.kennr || item.mittelname}-${item.awg_id || item.zul_ende || ''}`"
            class="beratung-bubble-card"
            :class="{ 'beratung-bubble-low-risk': item.geringes_risiko }"
          >
            <div class="beratung-bubble-name">{{ item.mittelname }}</div>
            <div v-if="item.wirkstoffe?.length" class="beratung-bubble-sub">
              {{ item.wirkstoffe.slice(0, 2).join(', ') }}
            </div>
            <div class="beratung-bubble-tags">
              <span v-if="item.geringes_risiko" class="beratung-bubble-tag beratung-tag-green">geringes Risiko</span>
              <span v-if="item.wartezeit_tage" class="beratung-bubble-tag">⏱ {{ item.wartezeit_tage }}d</span>
              <span v-if="item.aufwand_info" class="beratung-bubble-tag">📏 {{ item.aufwand_info }}</span>
              <span v-if="item.zul_ende" class="beratung-bubble-tag beratung-tag-muted">bis {{ item.zul_ende.slice(0, 10) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="aiAdviceEnabled" class="card">
        <h3 class="section-title">🤖 Empfehlung</h3>
        <div id="beratung-empfehlung-loading" class="forecast-info-box" :class="{ hidden: !isRecommendationLoading }">
          Empfehlung wird erstellt...
        </div>
        <div id="beratung-empfehlung-error" class="forecast-error-box" :class="{ hidden: !recommendationError }">
          {{ recommendationError }}
        </div>
        <div id="beratung-empfehlung-result" class="beratung-empfehlung-text" :class="{ hidden: !recommendationText }">
          <template v-for="(line, index) in recommendationLines" :key="`${index}-${line}`">
            <p v-if="line">{{ line }}</p>
            <br v-else />
          </template>
        </div>
        <div id="beratung-empfehlung-meta" class="beratung-empfehlung-meta" :class="{ hidden: !recommendationMeta }">
          {{ recommendationMeta }}
        </div>
      </div>
    </div>

    <div id="beratung-error" class="forecast-error-box" :class="{ hidden: !errorMessage }">{{ errorMessage }}</div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { apiGet, apiPost } from '../app/api.js';

export default {
  name: 'BeratungView',
  setup() {
    const kulturen = ref([]);
    const orte = ref([]);
    const selectedKulturId = ref('');
    const selectedOrtId = ref('');
    const schadQuery = ref('');
    const selectedSchadorg = ref(null);
    const dropdownItems = ref([]);
    const isDropdownOpen = ref(false);
    const isSearchLoading = ref(false);
    const isResolvingPartial = ref(false);
    const searchError = ref('');
    const schadInput = ref(null);
    const aiAdviceEnabled = ref(false);
    const isLlmConfigured = ref(true);
    const llmProvider = ref('');
    const isLoadingMittel = ref(false);
    const errorMessage = ref('');
    const mittel = ref([]);
    const showMittel = ref(false);
    const awgLoaded = ref(0);
    const awgTotal = ref(0);
    const detailLoaded = ref(0);
    const detailTotal = ref(0);
    const progressFound = computed(() => mittel.value.length);
    const isRecommendationLoading = ref(false);
    const recommendationError = ref('');
    const recommendationText = ref('');
    const recommendationMeta = ref('');
    let debounceTimer = null;
    let searchRequestId = 0;
    let mittelEventSource = null;

    const beratungButtonText = computed(() => (
      aiAdviceEnabled.value ? '🤖 Beratung starten' : '🧪 Mittel suchen'
    ));

    const beratungButtonTitle = computed(() => {
      if (!aiAdviceEnabled.value || isLlmConfigured.value) return '';
      const provider = String(llmProvider.value || 'LLM').toUpperCase();
      return `AI-Beratung ist aktiviert, aber ${provider} ist nicht konfiguriert`;
    });

    const recommendationLines = computed(() => recommendationText.value.split('\n'));
    const progressPercent = computed(() => {
      if (detailTotal.value) return Math.min(100, Math.round((detailLoaded.value / detailTotal.value) * 100));
      if (awgTotal.value) return Math.min(95, Math.round((awgLoaded.value / awgTotal.value) * 100));
      return isLoadingMittel.value ? 8 : 0;
    });
    const progressLabel = computed(() => {
      if (isLoadingMittel.value) {
        if (detailTotal.value) return `Lade Mitteldetails (${progressPercent.value}%)`;
        if (awgTotal.value) return `Prüfe Anwendungen (${awgLoaded.value} / ${awgTotal.value})`;
        return 'Suche zugelassene Mittel...';
      }
      return `Abgeschlossen: ${progressFound.value} Mittel gefunden`;
    });
    const emptyLoadingText = computed(() => (
      awgTotal.value && !detailTotal.value
        ? 'Passende Anwendungen werden geprüft...'
        : 'Mittel werden geladen...'
    ));

    watch(selectedKulturId, () => {
      selectedSchadorg.value = null;
      schadQuery.value = '';
      dropdownItems.value = [];
      closeDropdown();
      clearResult();
      errorMessage.value = '';
    });

    async function loadKulturen() {
      try {
        const items = await apiGet('/api/kulturen');
        kulturen.value = Array.isArray(items) ? items : [];
      } catch (error) {
        console.error('loadBeratungKulturen failed', error);
      }
    }

    async function loadOrte() {
      try {
        const items = await apiGet('/api/orte');
        orte.value = Array.isArray(items) ? items : [];
      } catch (error) {
        console.error('loadBeratungOrte failed', error);
      }
    }

    async function checkLLMStatus() {
      try {
        const result = await apiGet('/api/beratung/llm-status');
        isLlmConfigured.value = result?.configured !== false;
        aiAdviceEnabled.value = result?.ai_enabled === true;
        llmProvider.value = result?.provider || '';
      } catch (error) {
        console.error('checkLLMStatus failed', error);
        aiAdviceEnabled.value = false;
      }
    }

    function openDropdown() {
      if (schadQuery.value.trim().length < 2 && !dropdownItems.value.length) return;
      isDropdownOpen.value = true;
    }

    function closeDropdown() {
      isDropdownOpen.value = false;
    }

    function onDocumentClick(event) {
      if (!event.target.closest('.beratung-search-wrap')) {
        closeDropdown();
      }
    }

    function onSchadInput() {
      clearTimeout(debounceTimer);
      selectedSchadorg.value = null;
      searchError.value = '';

      const query = schadQuery.value.trim();
      if (query.length < 2) {
        dropdownItems.value = [];
        closeDropdown();
        return;
      }

      isDropdownOpen.value = true;
      debounceTimer = window.setTimeout(() => searchSchadorganismen(query), 350);
    }

    async function searchSchadorganismen(query) {
      const requestId = ++searchRequestId;
      isSearchLoading.value = true;
      isResolvingPartial.value = false;
      searchError.value = '';
      dropdownItems.value = [];
      isDropdownOpen.value = true;

      const params = new URLSearchParams({ q: query });
      if (selectedKulturId.value) params.append('kultur_id', selectedKulturId.value);

      try {
        const result = await apiGet(`/api/beratung/schadorganismen?${params.toString()}`);
        if (requestId !== searchRequestId) return;

        const items = Array.isArray(result?.items) ? result.items : [];
        dropdownItems.value = items;
        isSearchLoading.value = false;

        if (result?.partial && result?.pending_kodes?.length) {
          await resolveSchadorganismen(result.pending_kodes, items, requestId);
        }
      } catch (error) {
        if (requestId !== searchRequestId) return;
        console.error('searchSchadorganismen failed', error);
        isSearchLoading.value = false;
        searchError.value = 'Fehler bei der Suche';
      }
    }

    async function resolveSchadorganismen(pendingKodes, existingItems, requestId) {
      isResolvingPartial.value = true;
      const params = new URLSearchParams({ kodes: pendingKodes.join(',') });
      if (selectedKulturId.value) params.append('kultur_id', selectedKulturId.value);

      try {
        const result = await apiGet(`/api/beratung/schadorganismen/resolve?${params.toString()}`);
        if (requestId !== searchRequestId) return;

        const resolvedItems = Array.isArray(result?.items) ? result.items : [];
        dropdownItems.value = [...existingItems, ...resolvedItems]
          .sort((a, b) => String(a.bezeichnung || '').localeCompare(String(b.bezeichnung || '')));
      } catch (error) {
        console.error('resolveSchadorganismen failed', error);
      } finally {
        if (requestId === searchRequestId) {
          isResolvingPartial.value = false;
        }
      }
    }

    function selectSchadorg(item) {
      clearTimeout(debounceTimer);
      selectedSchadorg.value = {
        kode: item.kode,
        bezeichnung: item.bezeichnung,
      };
      schadQuery.value = '';
      closeDropdown();
    }

    function clearSchadorg() {
      selectedSchadorg.value = null;
    }

    function clearResult() {
      closeMittelStream();
      mittel.value = [];
      showMittel.value = false;
      awgLoaded.value = 0;
      awgTotal.value = 0;
      detailLoaded.value = 0;
      detailTotal.value = 0;
      recommendationError.value = '';
      recommendationText.value = '';
      recommendationMeta.value = '';
    }

    function closeMittelStream() {
      if (mittelEventSource) {
        mittelEventSource.close();
        mittelEventSource = null;
      }
    }

    async function startBeratung() {
      if (!selectedKulturId.value) {
        errorMessage.value = 'Bitte eine Kultur auswählen.';
        return;
      }

      if (!selectedSchadorg.value) {
        errorMessage.value = 'Bitte einen Schadorganismus auswählen.';
        return;
      }

      clearResult();
      errorMessage.value = '';
      isLoadingMittel.value = true;
      showMittel.value = true;

      const params = new URLSearchParams({
        kultur_id: selectedKulturId.value,
        schadorg_kode: selectedSchadorg.value.kode,
      });

      closeMittelStream();
      mittelEventSource = new EventSource(`/api/beratung/mittel/stream?${params.toString()}`);

      mittelEventSource.onmessage = async (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error('beratung stream parse failed', error);
          return;
        }

        if (data.type === 'progress') {
          if (data.phase === 'kennr') {
            awgLoaded.value = Number(data.loaded || 0);
            awgTotal.value = Number(data.total || 0);
          } else {
            detailLoaded.value = Number(data.loaded || 0);
            detailTotal.value = Number(data.total || 0);
          }
          return;
        }

        if (data.type === 'mittel' && data.mittel) {
          mittel.value.push(data.mittel);
          return;
        }

        if (data.type === 'done') {
          isLoadingMittel.value = false;
          closeMittelStream();
          if (aiAdviceEnabled.value) {
            await loadRecommendation();
          }
          return;
        }

        if (data.type === 'error') {
          isLoadingMittel.value = false;
          errorMessage.value = data.message || 'Fehler beim Laden der Mittel.';
          closeMittelStream();
        }
      };

      mittelEventSource.onerror = () => {
        isLoadingMittel.value = false;
        errorMessage.value = 'Verbindung zum Mittel-Stream unterbrochen.';
        closeMittelStream();
      };
    }

    async function loadRecommendation() {
      recommendationError.value = '';
      recommendationText.value = '';
      recommendationMeta.value = '';

      if (!isLlmConfigured.value) {
        recommendationError.value = 'AI-Beratung ist aktiviert, aber nicht konfiguriert.';
        return;
      }

      isRecommendationLoading.value = true;

      try {
        const result = await apiPost('/api/beratung/empfehlung', {
          kultur_id: Number.parseInt(selectedKulturId.value, 10),
          schadorg_kode: selectedSchadorg.value.kode,
          schadorg_name: selectedSchadorg.value.bezeichnung,
          ort_id: selectedOrtId.value ? Number.parseInt(selectedOrtId.value, 10) : null,
        });

        if (!result?.ok) {
          recommendationError.value = result?.message || 'Fehler bei der Empfehlung.';
          return;
        }

        recommendationText.value = result.empfehlung || '';
        recommendationMeta.value = `Erstellt mit ${result.model} (${result.provider})`;
      } catch (error) {
        recommendationError.value = error?.message || 'Fehler bei der Empfehlung.';
      } finally {
        isRecommendationLoading.value = false;
      }
    }

    onMounted(() => {
      document.addEventListener('click', onDocumentClick);
      loadKulturen();
      loadOrte();
      checkLLMStatus();
    });

    onBeforeUnmount(() => {
      clearTimeout(debounceTimer);
      closeMittelStream();
      document.removeEventListener('click', onDocumentClick);
    });

    return {
      aiAdviceEnabled,
      beratungButtonText,
      beratungButtonTitle,
      clearSchadorg,
      closeDropdown,
      dropdownItems,
      detailLoaded,
      detailTotal,
      errorMessage,
      emptyLoadingText,
      isDropdownOpen,
      isLlmConfigured,
      isLoadingMittel,
      isRecommendationLoading,
      isResolvingPartial,
      isSearchLoading,
      kulturen,
      mittel,
      onSchadInput,
      openDropdown,
      orte,
      awgLoaded,
      awgTotal,
      progressFound,
      progressLabel,
      progressPercent,
      recommendationError,
      recommendationLines,
      recommendationMeta,
      recommendationText,
      schadInput,
      schadQuery,
      searchError,
      selectSchadorg,
      selectedKulturId,
      selectedOrtId,
      selectedSchadorg,
      showMittel,
      startBeratung,
    };
  },
};
</script>
