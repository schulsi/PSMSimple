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
              :style="dropdownStyle"
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
          <label>Einsatzort (optional, für Wetterfenster)</label>
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
          :disabled="!isLlmConfigured || isLoadingMittel || isRecommendationLoading"
          :title="llmButtonTitle"
          @click="startBeratung"
        >
          {{ llmButtonText }}
        </button>
      </div>
    </div>

    <div id="beratung-mittel-wrap" :class="{ hidden: !showMittel }">
      <div class="card mb-085">
        <h3 class="section-title">🧪 Zugelassene Mittel <span id="beratung-mittel-count" class="badge">{{ mittel.length }}</span></h3>
        <p class="text-muted-history">Alle aktuell zugelassenen Mittel laut BVL für die gewählte Kombination.</p>
        <div id="beratung-mittel-list" class="beratung-bubble-grid">
          <div v-if="!mittel.length" class="empty">Keine zugelassenen Mittel gefunden.</div>
          <div
            v-for="item in mittel"
            :key="`${item.mittelname}-${item.zul_ende || ''}`"
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

      <div class="card">
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

    <div id="beratung-loading" class="forecast-info-box" :class="{ hidden: !isLoadingMittel }">Mittel werden geladen...</div>
    <div id="beratung-error" class="forecast-error-box" :class="{ hidden: !errorMessage }">{{ errorMessage }}</div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

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
    const dropdownStyle = reactive({});
    const isLlmConfigured = ref(true);
    const llmProvider = ref('');
    const isLoadingMittel = ref(false);
    const errorMessage = ref('');
    const mittel = ref([]);
    const showMittel = ref(false);
    const isRecommendationLoading = ref(false);
    const recommendationError = ref('');
    const recommendationText = ref('');
    const recommendationMeta = ref('');
    let debounceTimer = null;
    let searchRequestId = 0;

    const llmButtonText = computed(() => (
      isLlmConfigured.value ? '🤖 Beratung starten' : '🤖 Beratung starten (nicht konfiguriert)'
    ));

    const llmButtonTitle = computed(() => {
      if (isLlmConfigured.value) return '';
      const provider = String(llmProvider.value || 'LLM').toUpperCase();
      return `LLM nicht konfiguriert - bitte ${provider}_API_KEY setzen`;
    });

    const recommendationLines = computed(() => recommendationText.value.split('\n'));

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
        llmProvider.value = result?.provider || '';
      } catch (error) {
        console.error('checkLLMStatus failed', error);
      }
    }

    function positionDropdown() {
      const rect = schadInput.value?.getBoundingClientRect?.();
      if (!rect) return;

      Object.assign(dropdownStyle, {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }

    function openDropdown() {
      if (schadQuery.value.trim().length < 2 && !dropdownItems.value.length) return;
      positionDropdown();
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

      positionDropdown();
      isDropdownOpen.value = true;
      debounceTimer = window.setTimeout(() => searchSchadorganismen(query), 350);
    }

    async function searchSchadorganismen(query) {
      const requestId = ++searchRequestId;
      isSearchLoading.value = true;
      isResolvingPartial.value = false;
      searchError.value = '';
      dropdownItems.value = [];
      positionDropdown();
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
      mittel.value = [];
      showMittel.value = false;
      recommendationError.value = '';
      recommendationText.value = '';
      recommendationMeta.value = '';
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

      try {
        const result = await apiPost('/api/beratung/mittel', {
          kultur_id: Number.parseInt(selectedKulturId.value, 10),
          schadorg_kode: selectedSchadorg.value.kode,
        });

        isLoadingMittel.value = false;

        if (!result?.ok) {
          errorMessage.value = result?.message || 'Fehler beim Laden der Mittel.';
          return;
        }

        mittel.value = Array.isArray(result.mittel) ? result.mittel : [];
        showMittel.value = true;
        await loadRecommendation();
      } catch (error) {
        isLoadingMittel.value = false;
        errorMessage.value = error?.message || 'Unbekannter Fehler.';
      }
    }

    async function loadRecommendation() {
      recommendationError.value = '';
      recommendationText.value = '';
      recommendationMeta.value = '';
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
      window.addEventListener('resize', positionDropdown);
      loadKulturen();
      loadOrte();
      checkLLMStatus();
    });

    onBeforeUnmount(() => {
      clearTimeout(debounceTimer);
      document.removeEventListener('click', onDocumentClick);
      window.removeEventListener('resize', positionDropdown);
    });

    return {
      clearSchadorg,
      closeDropdown,
      dropdownItems,
      dropdownStyle,
      errorMessage,
      isDropdownOpen,
      isLlmConfigured,
      isLoadingMittel,
      isRecommendationLoading,
      isResolvingPartial,
      isSearchLoading,
      kulturen,
      llmButtonText,
      llmButtonTitle,
      mittel,
      onSchadInput,
      openDropdown,
      orte,
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
