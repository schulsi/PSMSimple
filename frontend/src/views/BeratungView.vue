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
        <div v-if="isLoadingMittel || progressTotal > 0" class="beratung-progress-wrap">
          <div class="beratung-progress-meta">
            <span>Gefunden: <strong>{{ progressFound }}</strong></span>
            <span>Geprüft: <strong>{{ progressLoaded }}</strong><template v-if="progressTotal"> / {{ progressTotal }}</template></span>
          </div>
          <div class="beratung-progress-bar-track">
            <div class="beratung-progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <div class="beratung-progress-label">{{ progressLabel }}</div>
        </div>
        <div id="beratung-mittel-list" class="beratung-bubble-grid">
          <div v-if="isLoadingMittel && !mittel.length" class="empty">{{ emptyLoadingText }}</div>
          <div v-else-if="!mittel.length" class="empty">Keine zugelassenen Mittel gefunden.</div>
          <button
            v-for="item in mittel"
            :key="`${item.kennr || item.mittelname}-${item.awg_id || item.zul_ende || ''}`"
            type="button"
            class="beratung-bubble-card"
            :class="{
              'beratung-bubble-low-risk': item.geringes_risiko,
              'beratung-bubble-selected': isSelectedMittel(item),
            }"
            @click="loadMittelDetails(item)"
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
          </button>
        </div>

        <div v-if="selectedMittel" class="beratung-detail-panel">
          <div class="beratung-detail-head">
            <div>
              <h4>{{ mittelDetailInfo?.title || selectedMittel.mittelname }}</h4>
              <div class="beratung-detail-sub">
                {{ mittelDetailInfo?.subtitle || `Kennnr. ${selectedMittel.kennr || '-'}` }}<template v-if="selectedMittel.awg_id"> · AWG {{ selectedMittel.awg_id }}</template>
              </div>
            </div>
            <div class="beratung-detail-actions">
              <a
                v-if="mittelDetailInfo?.source_url"
                class="btn btn-ghost"
                :href="mittelDetailInfo.source_url"
                target="_blank"
                rel="noopener noreferrer"
              >
                BVL-Quelle
              </a>
              <button type="button" class="btn btn-ghost" @click="clearMittelDetails">Schließen</button>
            </div>
          </div>

          <div v-if="isMittelDetailLoading" class="forecast-info-box">Details werden geladen...</div>
          <div v-else-if="mittelDetailError" class="forecast-error-box">{{ mittelDetailError }}</div>
          <template v-else-if="mittelDetailInfo">
            <div class="beratung-detail-summary">
              <div
                v-for="entry in mittelDetailFacts"
                :key="entry.label"
                class="beratung-detail-summary-item"
              >
                <span>{{ entry.label }}</span>
                <strong>{{ entry.value }}</strong>
              </div>
            </div>

            <div class="beratung-detail-groups">
              <section
                v-for="group in mittelDetailGroups"
                :key="group.title"
                class="beratung-detail-group"
              >
                <h5>{{ group.title }}</h5>
                <div class="beratung-detail-field-list">
                  <div
                    v-for="field in group.items"
                    :key="`${group.title}-${field.label}`"
                    class="beratung-detail-field"
                  >
                    <span>{{ field.label }}</span>
                    <p>{{ field.value }}</p>
                  </div>
                </div>
              </section>
            </div>

            <details class="beratung-detail-raw">
              <summary>BVL-Rohdaten anzeigen</summary>
              <div class="beratung-detail-raw-sections">
                <details
                  v-for="section in mittelDetailSections"
                  :key="section.title"
                  class="beratung-detail-section"
                >
                  <summary>{{ section.title }} <span>{{ section.items.length }}</span></summary>
                  <div
                    v-for="(row, rowIndex) in section.items"
                    :key="`${section.title}-${rowIndex}`"
                    class="beratung-detail-row"
                  >
                    <dl>
                      <template v-for="field in detailFields(row)" :key="`${section.title}-${rowIndex}-${field.key}`">
                        <dt>{{ field.label }}</dt>
                        <dd>{{ field.value }}</dd>
                      </template>
                    </dl>
                  </div>
                </details>
              </div>
            </details>
          </template>
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
    const selectedMittel = ref(null);
    const mittelDetail = ref(null);
    const isMittelDetailLoading = ref(false);
    const mittelDetailError = ref('');
    const progressLoaded = ref(0);
    const progressTotal = ref(0);
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
      if (progressTotal.value) return Math.min(100, Math.round((progressLoaded.value / progressTotal.value) * 100));
      return isLoadingMittel.value ? 8 : 0;
    });
    const progressLabel = computed(() => {
      if (isLoadingMittel.value) {
        if (progressTotal.value) return `Prüfe Anwendungen (${progressLoaded.value} / ${progressTotal.value})`;
        return 'Suche zugelassene Mittel...';
      }
      return `Abgeschlossen: ${progressFound.value} Mittel gefunden`;
    });
    const emptyLoadingText = computed(() => 'Mittel werden geladen...');
    const mittelDetailInfo = computed(() => mittelDetail.value?.detail || null);
    const mittelDetailFacts = computed(() => (
      Array.isArray(mittelDetailInfo.value?.facts) ? mittelDetailInfo.value.facts : []
    ));
    const mittelDetailGroups = computed(() => (
      Array.isArray(mittelDetailInfo.value?.groups)
        ? mittelDetailInfo.value.groups.map((group) => ({
          ...group,
          items: Array.isArray(group.items) ? group.items : [],
        })).filter((group) => group.items.length)
        : []
    ));
    const mittelDetailSections = computed(() => {
      const sections = Array.isArray(mittelDetail.value?.sections) ? mittelDetail.value.sections : [];
      return sections
        .filter((section) => Array.isArray(section.items) && section.items.length)
        .map((section, index) => ({ ...section, open: index < 2 }));
    });

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
      clearMittelDetails();
      progressLoaded.value = 0;
      progressTotal.value = 0;
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

    function clearMittelDetails() {
      selectedMittel.value = null;
      mittelDetail.value = null;
      mittelDetailError.value = '';
      isMittelDetailLoading.value = false;
    }

    function isSelectedMittel(item) {
      if (!selectedMittel.value) return false;
      return selectedMittel.value.kennr === item.kennr && selectedMittel.value.awg_id === item.awg_id;
    }

    async function loadMittelDetails(item) {
      selectedMittel.value = item;
      mittelDetail.value = null;
      mittelDetailError.value = '';

      if (!item?.kennr) {
        mittelDetailError.value = 'Für dieses Mittel fehlt die Kennnummer.';
        return;
      }

      isMittelDetailLoading.value = true;
      const params = new URLSearchParams({ kennr: item.kennr });
      if (item.awg_id) params.append('awg_id', item.awg_id);

      try {
        const result = await apiGet(`/api/beratung/mittel/detail?${params.toString()}`);
        if (!result?.ok) {
          mittelDetailError.value = result?.message || 'Details konnten nicht geladen werden.';
          return;
        }
        mittelDetail.value = result;
      } catch (error) {
        mittelDetailError.value = error?.message || 'Details konnten nicht geladen werden.';
      } finally {
        isMittelDetailLoading.value = false;
      }
    }

    function formatDetailLabel(key) {
      const labels = {
        anwendungen_anz_je_befall: 'Anwendungen je Befall',
        anwendungen_anz_je_kultur: 'Anwendungen je Kultur',
        anwendungen_anz_je_jahr: 'Anwendungen je Jahr',
        behandlungen_anz_je_befall: 'Behandlungen je Befall',
        behandlungen_anz_je_kultur: 'Behandlungen je Kultur',
        behandlungen_anz_je_jahr: 'Behandlungen je Jahr',
        awg_id: 'AWG-ID',
        kennr: 'Zulassungsnummer',
        mittelname: 'Mittelname',
        zul_ende: 'Zulassungsende',
        m_aufwand: 'Mittel-Aufwand',
        m_aufwandmenge: 'Mittel-Aufwandmenge',
        m_aufwand_einheit: 'Mittel-Aufwandeinheit',
      };
      const normalized = String(key || '').toLowerCase();
      if (labels[normalized]) return labels[normalized];
      return String(key || '')
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\w/, (letter) => letter.toUpperCase());
    }

    function detailFields(row) {
      return Object.entries(row || {})
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({
          key,
          label: formatDetailLabel(key),
          value: Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : String(value),
        }));
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
          progressLoaded.value = Number(data.loaded || 0);
          progressTotal.value = Number(data.total || 0);
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
      clearMittelDetails,
      closeDropdown,
      detailFields,
      formatDetailLabel,
      dropdownItems,
      errorMessage,
      emptyLoadingText,
      isDropdownOpen,
      isLlmConfigured,
      isLoadingMittel,
      isMittelDetailLoading,
      isRecommendationLoading,
      isResolvingPartial,
      isSearchLoading,
      isSelectedMittel,
      kulturen,
      loadMittelDetails,
      mittel,
      mittelDetail,
      mittelDetailError,
      mittelDetailFacts,
      mittelDetailGroups,
      mittelDetailInfo,
      mittelDetailSections,
      onSchadInput,
      openDropdown,
      orte,
      progressFound,
      progressLoaded,
      progressLabel,
      progressPercent,
      progressTotal,
      recommendationError,
      recommendationLines,
      recommendationMeta,
      recommendationText,
      schadInput,
      schadQuery,
      searchError,
      selectSchadorg,
      selectedKulturId,
      selectedMittel,
      selectedOrtId,
      selectedSchadorg,
      showMittel,
      startBeratung,
    };
  },
};
</script>
