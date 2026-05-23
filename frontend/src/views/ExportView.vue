<template>
  <div class="tab-content export-tab">
    <h2>📄 Dokumentation erstellen</h2>

    <div class="card export-section">
      <h3>🧪 Pflanzenschutzmittel & Aufwandsmenge</h3>
      <p class="export-help-text">Mittel auswählen und Aufwandsmenge für diese Anwendung eingeben.</p>
      <div id="exp-psm-list">
        <div v-if="!psmItems.length" class="empty">Keine Einträge vorhanden.</div>
        <div
          v-for="item in psmItems"
          :id="`exp-psm-${item.id}`"
          :key="item.id"
          class="exp-item"
          :class="{ selected: selectedPsmIds.includes(item.id) }"
        >
          <label class="exp-item-header">
            <input
              v-model.number="selectedPsmIds"
              type="checkbox"
              class="exp-psm-check"
              :data-id="item.id"
              :value="item.id"
              @change="syncValidation"
            />
            <div>
              <div class="ci-name">{{ item.name || '—' }}</div>
              <div class="ci-meta">{{ item.zulassungsnr || '—' }} · {{ item.aufwandEinheit || '—' }}</div>
            </div>
          </label>
          <div class="exp-item-extra">
            <label>Aufwandsmenge</label>
            <input
              v-model="psmAmounts[item.id]"
              type="number"
              class="exp-psm-amount"
              :data-id="item.id"
              placeholder="z. B. 1,5"
              @input="syncValidation"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="card export-section">
      <h3>🌾 Kulturen & BBCH-Code</h3>
      <p class="export-help-text">Zuerst die Kultur auswählen. Danach werden nur passende Felder angezeigt.</p>
      <div id="exp-kulturen-list">
        <div v-if="!kulturenItems.length" class="empty">Keine Einträge vorhanden.</div>
        <div
          v-for="item in kulturenItems"
          :id="`exp-kultur-${item.id}`"
          :key="item.id"
          class="exp-item"
          :class="{ selected: selectedKulturIds.includes(item.id) }"
        >
          <label class="exp-item-header">
            <input
              v-model.number="selectedKulturIds"
              type="checkbox"
              class="exp-kultur-check"
              :data-id="item.id"
              :value="item.id"
              @change="handleKulturToggle(item.id)"
            />
            <div>
              <div class="ci-name">{{ item.name || '—' }}</div>
              <div class="ci-meta">{{ item.eppoCode || '—' }}</div>
            </div>
          </label>
          <div class="exp-item-extra">
            <label>BBCH-Code</label>
            <div class="autocomplete-wrap exp-bbch-autocomplete">
              <input
                v-model="kulturBbch[item.id]"
                type="text"
                class="exp-kultur-bbch"
                :data-id="item.id"
                :data-kultur-name="item.name || ''"
                :disabled="!selectedKulturIds.includes(item.id)"
                placeholder="Code oder Beschreibung suchen"
                autocomplete="off"
                @blur="handleBbchBlur(item.id)"
                @focus="openBbchDropdown(item.id, $event)"
                @input="handleBbchInput(item.id, $event)"
                @keydown="handleBbchKeydown(item.id, $event)"
              />
              <div
                class="autocomplete-results exp-kultur-bbch-results"
                :class="{ show: activeBbchKulturId === item.id }"
                :data-id="item.id"
                :style="activeBbchKulturId === item.id ? bbchDropdownStyle : null"
              >
                <div v-if="!getBbchMatches(item.id).length" class="autocomplete-empty">
                  Keine passenden BBCH-Codes gefunden
                </div>
                <button
                  v-for="(match, index) in getBbchMatches(item.id)"
                  :key="`${item.id}-${match.code}-${index}`"
                  type="button"
                  class="autocomplete-item exp-bbch-item"
                  :class="{ active: activeBbchIndex === index }"
                  @mousedown.prevent="applyBbchSelection(item.id, match)"
                >
                  <div><strong>{{ match.code || '—' }}</strong> – {{ match.bezeichnung || 'Ohne Bezeichnung' }}</div>
                  <div v-if="match.beschreibung" class="ci-meta">{{ match.beschreibung }}</div>
                </button>
              </div>
            </div>
            <div class="exp-kultur-bbch-hint text-muted" :data-id="item.id">{{ bbchHints[item.id] || '' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card export-section">
      <h3>📍 Felder auswählen</h3>
      <p class="export-help-text">Es werden nur Felder der ausgewählten Kulturen angezeigt.</p>
      <div v-if="selectedKulturIds.length && filteredFelderItems.length" class="export-quick-select quick-select-row">
        <button
          type="button"
          class="btn btn-ghost"
          @click="quickSelectAllFields"
        >
          {{ areAllVisibleFieldsSelected ? 'Alle Felder abwählen' : 'Alle Felder auswählen' }}
        </button>
        <button
          v-for="group in quickSelectGroups"
          :key="group.ortKey"
          type="button"
          class="btn btn-ghost"
          @click="quickSelectFieldsByOrt(group.ortKey)"
        >
          Alle {{ group.count }} Feld{{ group.count === 1 ? '' : 'er' }} in {{ group.ortName }}
          {{ group.allSelected ? 'abwählen' : 'auswählen' }}
        </button>
      </div>
      <div id="exp-einsatzorte-list">
        <div v-if="!selectedKulturIds.length" class="empty">Bitte zuerst mindestens eine Kultur auswählen.</div>
        <div v-else-if="!filteredFelderItems.length" class="empty">
          Keine Felder für diese Kulturen vorhanden.
        </div>
        <div
          v-for="item in filteredFelderItems"
          :id="`exp-einsatzort-${item.id}`"
          :key="item.id"
          class="exp-item"
          :class="{ selected: selectedFeldIds.includes(item.id) }"
        >
          <label class="exp-item-header">
            <input
              v-model.number="selectedFeldIds"
              type="checkbox"
              class="exp-einsatzort-check"
              :data-id="item.id"
              :value="item.id"
              @change="syncValidation"
            />
            <div>
              <div class="ci-name">{{ item.name || '—' }}</div>
              <div class="ci-meta">
                {{ getOrtName(item.ort_id) }} ·
                {{ item.anwendungsbereich || '—' }} · {{ item.flaecheVolumen || '—' }} {{ item.einheit || '' }}
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <div class="card export-section">
      <h3>📋 Anwendung</h3>
      <div class="form-grid">
        <div class="field">
          <label>Datum</label>
          <input id="exp-datum" v-model="form.datum" type="date" @input="syncValidation" />
        </div>
        <div class="field">
          <label>Uhrzeit</label>
          <input id="exp-uhrzeit" v-model="form.uhrzeit" type="time" @input="syncValidation" />
        </div>
        <div class="field">
          <label>Art der Verwendung</label>
          <select id="exp-art-haupt" v-model="form.artHaupt" @change="refreshArtSubOptions">
            <option v-for="option in artHauptOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
        <div class="field">
          <label>Subkategorie</label>
          <select id="exp-art-sub" v-model="form.artSub" @change="syncValidation">
            <option v-for="option in currentArtSubOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
        <div class="field">
          <label>Verantwortlich</label>
          <input id="exp-verantwortlich" v-model="form.verantwortlich" type="text" @input="syncValidation" />
        </div>
        <div class="field">
          <label>Anwender</label>
          <input id="exp-anwender" v-model="form.anwender" type="text" @input="syncValidation" />
        </div>
      </div>
      <input id="exp-artVerwendung" type="hidden" :value="artVerwendung" />
    </div>

    <div class="export-footer">
      <button id="btn-preview" type="button" class="btn btn-ghost" :disabled="!valid || isSubmitting" @click="handlePreview">
        👁 Vorschau
      </button>
      <button
        id="btn-save"
        type="button"
        class="btn btn-export"
        :class="{ hidden: !isLocalSaveMode }"
        :disabled="!valid || isSubmitting"
        @click="handleSave"
      >
        💾 Speichern
      </button>
      <button
        id="btn-download"
        type="button"
        class="btn btn-export"
        :class="{ hidden: isLocalSaveMode }"
        :disabled="!valid || isSubmitting"
        @click="handleDownload"
      >
        ⬇ Download
      </button>
    </div>
    <div id="validation-msg" class="validation-msg" :class="{ hidden: valid }">{{ validationMessage }}</div>

    <div id="json-preview-wrap" v-if="previewJson" class="preview-wrap">
      <div class="divider"></div>
      <h3 class="preview-title">🔍 Vorschau</h3>
      <pre id="preview-json">{{ previewJson }}</pre>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRef, watch } from 'vue';

import { registerExportView, toast } from '../app/appBridge.js';
import { apiGet, apiPost, getCsrfToken } from '../app/api.js';

const validationText = 'Bitte mindestens ein Pflanzenschutzmittel, ein Feld, eine Kultur sowie Datum, Uhrzeit und Art der Verwendung auswählen. Aufwandsmenge und BBCH-Code sind erforderlich.';

export default {
  name: 'ExportView',
  props: {
    psmItems: {
      type: Array,
      default: () => [],
    },
    felderItems: {
      type: Array,
      default: () => [],
    },
    kulturenItems: {
      type: Array,
      default: () => [],
    },
    orteItems: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    const psmItems = toRef(props, 'psmItems');
    const felderItems = toRef(props, 'felderItems');
    const kulturenItems = toRef(props, 'kulturenItems');
    const orteItems = toRef(props, 'orteItems');
    const selectedPsmIds = ref([]);
    const selectedFeldIds = ref([]);
    const selectedKulturIds = ref([]);
    const psmAmounts = reactive({});
    const kulturBbch = reactive({});
    const bbchCache = reactive({});
    const bbchMatches = reactive({});
    const bbchHints = reactive({});
    const activeBbchKulturId = ref(null);
    const activeBbchIndex = ref(-1);
    const bbchDropdownStyle = reactive({});
    const form = reactive({
      datum: '',
      uhrzeit: '',
      artHaupt: 'Behandlung von Freilandflächen',
      artSub: 'Flächenkulturen',
      verantwortlich: '',
      anwender: '',
    });

    const artHauptOptions = [
      'Behandlung von Freilandflächen',
      'Behandlung geschlossener Räume bzw. in geschlossenen Räumen',
      'Behandlung von Saatgut oder Pflanzenvermehrungsmaterial',
    ];

    const artSubOptions = {
      'Behandlung von Freilandflächen': ['Flächenkulturen', 'Raumkulturen', 'Forst', 'Nichtkulturland'],
      'Behandlung geschlossener Räume bzw. in geschlossenen Räumen': ['Gewächshaus', 'Lagerraum', 'Sonstige geschlossene Räume'],
      'Behandlung von Saatgut oder Pflanzenvermehrungsmaterial': ['Saatgut', 'Pflanzenvermehrungsmaterial'],
    };

    const validationMessage = ref(validationText);
    const previewJson = ref('');
    const isSubmitting = ref(false);
    const isLocalSaveMode = ref(true);
    const lastSavedHistorySignature = ref(null);
    let unregisterExportView = null;

    const artVerwendung = computed(() => {
      return form.artHaupt && form.artSub ? `${form.artHaupt} – ${form.artSub}` : form.artHaupt;
    });

    const currentArtSubOptions = computed(() => artSubOptions[form.artHaupt] || []);

    const filteredFelderItems = computed(() => {
      if (!selectedKulturIds.value.length) return [];

      const kulturIds = new Set(selectedKulturIds.value.map(id => String(id)));

      return felderItems.value.filter((item) => {
        return kulturIds.has(String(item.kultur_id ?? ''));
      });
    });

    const areAllVisibleFieldsSelected = computed(() => {
      if (!filteredFelderItems.value.length) return false;

      const selectedIds = new Set(selectedFeldIds.value);
      return filteredFelderItems.value.every(item => selectedIds.has(item.id));
    });

    const quickSelectGroups = computed(() => {
      const groups = new Map();
      const selectedIds = new Set(selectedFeldIds.value);

      filteredFelderItems.value.forEach((item) => {
        const ortKey = String(item.ort_id ?? '');
        if (!ortKey) return;

        if (!groups.has(ortKey)) {
          groups.set(ortKey, {
            ortKey,
            ortName: getOrtName(item.ort_id),
            count: 0,
            ids: [],
          });
        }

        groups.get(ortKey).count += 1;
        groups.get(ortKey).ids.push(item.id);
      });

      return [...groups.values()]
        .map(group => ({
          ...group,
          allSelected: group.ids.every(id => selectedIds.has(id)),
        }))
        .sort((a, b) => a.ortName.localeCompare(b.ortName, 'de'));
    });

    const valid = computed(() => {
      const hasPsm = selectedPsmIds.value.length > 0;
      const hasFeld = selectedFeldIds.value.length > 0;
      const hasKultur = selectedKulturIds.value.length > 0;
      const hasPsmAmount = hasPsm && selectedPsmIds.value.every(id => String(psmAmounts[id] ?? '').trim().length > 0);
      const hasKultBbch = hasKultur && selectedKulturIds.value.every(id => String(kulturBbch[id] ?? '').trim().length > 0);

      return (
        hasPsm &&
        hasFeld &&
        hasKultur &&
        !!form.datum &&
        !!form.uhrzeit &&
        !!form.artHaupt &&
        !!form.artSub &&
        hasPsmAmount &&
        hasKultBbch
      );
    });

    watch(currentArtSubOptions, (options) => {
      if (!options.includes(form.artSub)) {
        form.artSub = options[0] || '';
      }
    });

    watch(valid, () => syncValidation());

    watch(psmItems, items => pruneSelection(selectedPsmIds, items));
    watch(filteredFelderItems, pruneSelectedFelder);
    watch(kulturenItems, items => pruneSelection(selectedKulturIds, items));

    function pruneSelection(selectionRef, items = []) {
      const ids = new Set(items.map(item => item.id));
      selectionRef.value = selectionRef.value.filter(id => ids.has(id));
    }

    function pruneSelectedFelder() {
      const visibleIds = new Set(filteredFelderItems.value.map(item => item.id));
      selectedFeldIds.value = selectedFeldIds.value.filter(id => visibleIds.has(id));
      syncValidation();
    }

    function getOrtName(ortId) {
      const ort = orteItems.value.find(item => String(item.id) === String(ortId));
      return ort?.name || ort?.bezeichnung || (ortId ? `Ort #${ortId}` : 'Ohne Ort');
    }

    function applyVisibleFieldSelection(nextSelection) {
      selectedFeldIds.value = filteredFelderItems.value
        .map(item => item.id)
        .filter(id => nextSelection.has(id));
      syncValidation();
    }

    function quickSelectAllFields() {
      if (areAllVisibleFieldsSelected.value) {
        selectedFeldIds.value = [];
        syncValidation();
        return;
      }

      applyVisibleFieldSelection(new Set(filteredFelderItems.value.map(item => item.id)));
    }

    function quickSelectFieldsByOrt(ortKey) {
      const idsForOrt = filteredFelderItems.value
        .filter(item => String(item.ort_id ?? '') === String(ortKey))
        .map(item => item.id);
      const nextSelection = new Set(selectedFeldIds.value);
      const allForOrtSelected = idsForOrt.length > 0 && idsForOrt.every(id => nextSelection.has(id));

      idsForOrt.forEach((id) => {
        if (allForOrtSelected) {
          nextSelection.delete(id);
        } else {
          nextSelection.add(id);
        }
      });

      applyVisibleFieldSelection(nextSelection);
    }

    async function postResponse(url, data) {
      return fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(data),
      });
    }

    function syncValidation() {
      validationMessage.value = valid.value ? '' : validationText;
    }

    function getPayload() {
      return {
        anwendung: {
          datum: form.datum,
          uhrzeit: form.uhrzeit,
          artVerwendung: artVerwendung.value,
          anwender: form.anwender.trim(),
          verantwortlich: form.verantwortlich.trim(),
        },
        psm_overrides: selectedPsmIds.value.map(id => ({
          id,
          aufwandMenge: String(psmAmounts[id] ?? '').trim(),
        })),
        einsatzort_ids: [...selectedFeldIds.value],
        kult_overrides: selectedKulturIds.value.map(id => ({
          id,
          bbchCode: String(kulturBbch[id] ?? '').trim(),
        })),
      };
    }

    function getPayloadSignature(payload) {
      return JSON.stringify(payload);
    }

    async function ensureHistorySaved(payload) {
      const signature = getPayloadSignature(payload);
      if (lastSavedHistorySignature.value === signature) return;

      const preview = await apiPost('/api/preview', payload);
      const result = await apiPost('/api/history', preview);
      if (!result.ok) throw new Error(result.error || 'History konnte nicht gespeichert werden.');
      lastSavedHistorySignature.value = signature;
    }

    function buildExportBasename() {
      const datePart = form.datum ? form.datum.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
      const firstPsm = psmItems.value.find(item => selectedPsmIds.value.includes(item.id));
      const psmPart = String(firstPsm?.name || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_äöüÄÖÜß-]/g, '')
        .slice(0, 40);

      return psmPart ? `PSM_Anwendung_${datePart}_${psmPart}` : `PSM_Anwendung_${datePart}`;
    }

    async function parseErrorResponse(response, fallback) {
      const body = await response.json().catch(() => ({}));
      return new Error(body.error || fallback);
    }

    async function handlePreview() {
      if (!valid.value) {
        syncValidation();
        return;
      }

      try {
        isSubmitting.value = true;
        const data = await apiPost('/api/preview', getPayload());
        previewJson.value = JSON.stringify(data, null, 2);
        toast('✅ Vorschau aktualisiert');
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isSubmitting.value = false;
      }
    }

    async function handleSave() {
      if (!valid.value) {
        syncValidation();
        return;
      }

      try {
        isSubmitting.value = true;
        const payload = getPayload();
        await ensureHistorySaved(payload);

        const jsonResp = await postResponse('/api/export', payload);
        if (!jsonResp.ok) throw await parseErrorResponse(jsonResp, 'JSON-Speichern fehlgeschlagen');
        const jsonData = await jsonResp.json();

        const pdfResp = await postResponse('/api/pdf', payload);
        if (!pdfResp.ok) throw await parseErrorResponse(pdfResp, 'PDF-Speichern fehlgeschlagen');
        const pdfData = await pdfResp.json();

        toast(`✅ Gespeichert: ${jsonData.filename || 'JSON'} & ${pdfData.filename || 'PDF'}`);
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isSubmitting.value = false;
      }
    }

    async function getExportBlob(url, payload, fallbackError) {
      const response = await postResponse(url, payload);
      if (!response.ok) throw await parseErrorResponse(response, fallbackError);

      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return {
          blob: new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
          contentType,
        };
      }

      return {
        blob: await response.blob(),
        contentType,
      };
    }

    function downloadBlob(blob, filename) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    async function handleDownload() {
      if (!valid.value) {
        syncValidation();
        return;
      }

      try {
        isSubmitting.value = true;
        const payload = getPayload();
        await ensureHistorySaved(payload);
        const basename = buildExportBasename();
        const jsonFile = await getExportBlob('/api/export', payload, 'JSON-Export fehlgeschlagen');
        const pdfFile = await getExportBlob('/api/pdf', payload, 'PDF-Export fehlgeschlagen');
        const pdfIsMetadata = pdfFile.contentType.includes('application/json');

        if (typeof window.JSZip !== 'undefined') {
          const zip = new window.JSZip();
          zip.file(`${basename}.json`, jsonFile.blob);
          if (!pdfIsMetadata) zip.file(`${basename}.pdf`, pdfFile.blob);

          const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
          downloadBlob(zipBlob, `${basename}.zip`);
          toast(pdfIsMetadata ? '⚠️ ZIP ohne PDF heruntergeladen (Server-Modus).' : '✅ ZIP heruntergeladen');
          return;
        }

        downloadBlob(jsonFile.blob, `${basename}.json`);
        if (!pdfIsMetadata) {
          await new Promise(resolve => window.setTimeout(resolve, 300));
          downloadBlob(pdfFile.blob, `${basename}.pdf`);
        }
        toast(pdfIsMetadata ? '⚠️ JSON heruntergeladen, PDF ist nur im Server-Modus verfügbar.' : '✅ Dateien heruntergeladen');
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isSubmitting.value = false;
      }
    }

    function refreshArtSubOptions() {
      const options = artSubOptions[form.artHaupt] || [];
      if (!options.includes(form.artSub)) {
        form.artSub = options[0] || '';
      }
      syncValidation();
    }

    async function getBBCHOptionsForKultur(kulturId) {
      if (bbchCache[kulturId]) return bbchCache[kulturId];

      const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
      const normalized = Array.isArray(items) ? items : [];
      normalized.sort((a, b) => {
        const aSort = a.sortierung ?? Number.MAX_SAFE_INTEGER;
        const bSort = b.sortierung ?? Number.MAX_SAFE_INTEGER;
        return aSort - bSort;
      });

      bbchCache[kulturId] = normalized;
      return normalized;
    }

    function searchBBCHItems(items, query) {
      const q = String(query || '').trim().toLowerCase();
      const source = q
        ? items.filter(item => {
            const code = String(item.code || '').toLowerCase();
            const bezeichnung = String(item.bezeichnung || '').toLowerCase();
            const beschreibung = String(item.beschreibung || '').toLowerCase();
            return code.includes(q) || bezeichnung.includes(q) || beschreibung.includes(q);
          })
        : items;

      return source.slice(0, 8);
    }

    function getBbchMatches(kulturId) {
      return bbchMatches[kulturId] || [];
    }

    function positionBbchDropdown(event) {
      const rect = event?.target?.getBoundingClientRect?.();
      if (!rect) return;

      Object.assign(bbchDropdownStyle, {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }

    async function openBbchDropdown(kulturId, event) {
      activeBbchKulturId.value = kulturId;
      activeBbchIndex.value = -1;
      positionBbchDropdown(event);

      try {
        const items = await getBBCHOptionsForKultur(kulturId);
        bbchMatches[kulturId] = searchBBCHItems(items, kulturBbch[kulturId]);
      } catch (error) {
        console.error(error);
        toast(`❌ BBCH-Autocomplete konnte nicht geladen werden: ${error.message || error}`);
      }
    }

    async function handleBbchInput(kulturId, event) {
      syncValidation();
      positionBbchDropdown(event);
      activeBbchKulturId.value = kulturId;
      activeBbchIndex.value = -1;
      if (!String(kulturBbch[kulturId] || '').trim()) {
        bbchHints[kulturId] = '';
      }

      try {
        const items = await getBBCHOptionsForKultur(kulturId);
        bbchMatches[kulturId] = searchBBCHItems(items, kulturBbch[kulturId]);
      } catch (error) {
        console.error(error);
      }
    }

    function applyBbchSelection(kulturId, item) {
      kulturBbch[kulturId] = String(item.code || '');
      const bezeichnung = String(item.bezeichnung || '').trim();
      const beschreibung = String(item.beschreibung || '').trim();
      bbchHints[kulturId] = beschreibung ? `${bezeichnung} – ${beschreibung}` : bezeichnung;
      activeBbchKulturId.value = null;
      activeBbchIndex.value = -1;
      syncValidation();
    }

    async function handleBbchBlur(kulturId) {
      window.setTimeout(() => {
        if (activeBbchKulturId.value === kulturId) {
          activeBbchKulturId.value = null;
          activeBbchIndex.value = -1;
        }
      }, 150);

      const value = String(kulturBbch[kulturId] || '').trim();
      if (!value) {
        bbchHints[kulturId] = '';
        return;
      }

      try {
        const items = await getBBCHOptionsForKultur(kulturId);
        const exact = items.find(item => String(item.code) === value);
        bbchHints[kulturId] = exact
          ? exact.beschreibung
            ? `${exact.bezeichnung} – ${exact.beschreibung}`
            : `${exact.bezeichnung}`
          : 'Unbekannter BBCH-Code für diese Kultur';
      } catch (error) {
        console.error(error);
      }
    }

    function handleBbchKeydown(kulturId, event) {
      if (activeBbchKulturId.value !== kulturId) return;
      const matches = getBbchMatches(kulturId);
      if (!matches.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeBbchIndex.value = activeBbchIndex.value < matches.length - 1 ? activeBbchIndex.value + 1 : 0;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeBbchIndex.value = activeBbchIndex.value > 0 ? activeBbchIndex.value - 1 : matches.length - 1;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        applyBbchSelection(kulturId, matches[activeBbchIndex.value >= 0 ? activeBbchIndex.value : 0]);
      }

      if (event.key === 'Escape') {
        activeBbchKulturId.value = null;
        activeBbchIndex.value = -1;
      }
    }

    async function handleKulturToggle(kulturId) {
      pruneSelectedFelder();
      syncValidation();
      if (!selectedKulturIds.value.includes(kulturId)) return;

      try {
        await getBBCHOptionsForKultur(kulturId);
      } catch (error) {
        console.error(error);
        toast('❌ BBCH-Codes konnten nicht geladen werden');
      }
    }

    function applyDefaultSettings(settings = {}) {
      if (!form.anwender.trim() && settings.default_anwender) {
        form.anwender = settings.default_anwender;
      }
      if (!form.verantwortlich.trim() && settings.default_verantwortlich) {
        form.verantwortlich = settings.default_verantwortlich;
      }
      syncValidation();
    }

    function updateExportButtons(localSave) {
      isLocalSaveMode.value = !!localSave;
    }

    function installExportBridge() {
      unregisterExportView = registerExportView({
        applyDefaultSettingsToExport: applyDefaultSettings,
        exportDownloadZip: handleDownload,
        exportJSON: handleSave,
        exportPDF: handleSave,
        exportSave: handleSave,
        getExportPayload: getPayload,
        previewJSON: handlePreview,
        updateExportButtons,
      });
    }

    function restoreExportBridge() {
      unregisterExportView?.();
    }

    const now = new Date();
    form.datum = now.toISOString().slice(0, 10);
    form.uhrzeit = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    onMounted(() => {
      const saveToggle = document.getElementById('save-mode-toggle');
      isLocalSaveMode.value = saveToggle ? saveToggle.checked : true;
      installExportBridge();
      syncValidation();
    });

    onBeforeUnmount(() => {
      restoreExportBridge();
    });

    return {
      activeBbchIndex,
      activeBbchKulturId,
      areAllVisibleFieldsSelected,
      artHauptOptions,
      artVerwendung,
      bbchDropdownStyle,
      bbchHints,
      currentArtSubOptions,
      filteredFelderItems,
      form,
      getOrtName,
      handleBbchBlur,
      handleBbchInput,
      handleBbchKeydown,
      handleDownload,
      handleKulturToggle,
      handlePreview,
      handleSave,
      isLocalSaveMode,
      isSubmitting,
      kulturBbch,
      kulturenItems,
      openBbchDropdown,
      previewJson,
      psmAmounts,
      psmItems,
      quickSelectAllFields,
      quickSelectFieldsByOrt,
      quickSelectGroups,
      refreshArtSubOptions,
      selectedFeldIds,
      selectedKulturIds,
      selectedPsmIds,
      syncValidation,
      validationMessage,
      valid,
      applyBbchSelection,
      getBbchMatches,
    };
  },
};
</script>
