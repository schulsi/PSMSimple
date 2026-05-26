<template>
  <h2>🛠 Meldungen</h2>

  <div class="meldungen-layout">
    <aside class="meldungen-filter-panel">
      <div class="card meldungen-filter-card">
        <div class="section-head compact-section-head">
          <div>
            <h3>Filter</h3>
            <p class="section-subtitle">Meldungen eingrenzen.</p>
          </div>
          <button v-if="canWrite" type="button" class="btn btn-primary" @click="openCreateForm">
            + Neue Meldung
          </button>
        </div>

        <div class="form-grid filter-grid">
          <div class="field">
            <label>Status</label>
            <select v-model="filters.status" @change="loadMeldungen">
              <option value="">Alle</option>
              <option v-for="option in meta.status" :key="option" :value="option">
                {{ statusLabel(option) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>Typ</label>
            <select v-model="filters.typ" @change="loadMeldungen">
              <option value="">Alle</option>
              <option v-for="option in meta.typen" :key="option" :value="option">
                {{ typeLabel(option) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>Feld</label>
            <select v-model="filters.flaeche_id" @change="loadMeldungen">
              <option value="">Alle</option>
              <option v-for="feld in felderItems" :key="feld.id" :value="String(feld.id)">
                {{ feld.name || `Feld #${feld.id}` }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </aside>

    <section class="meldungen-list-panel">
      <div id="meldungen-list" class="item-list">
        <div v-if="isLoading" class="empty">Meldungen werden geladen...</div>
        <div v-else-if="!items.length" class="empty">Noch keine Meldungen vorhanden.</div>
        <button
          v-for="item in items"
          v-else
          :key="item.id"
          type="button"
          class="item meldung-list-item"
          :class="{ selected: selectedMeldung?.id === item.id }"
          @click="selectMeldung(item.id)"
        >
          <div class="item-info">
            <div class="name">{{ item.titel }}</div>
            <div class="meta">
              {{ item.datum }} · {{ typeLabel(item.typ) }} · {{ getFeldName(item.flaeche_id) }}
            </div>
          </div>
          <div class="item-actions">
            <span class="badge-status" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
            <span class="badge-status" :class="priorityClass(item.prioritaet)">{{ priorityLabel(item.prioritaet) }}</span>
          </div>
        </button>
      </div>
    </section>

    <section class="meldungen-detail-panel">
      <div v-if="selectedMeldung" class="card meldung-detail-card">
        <div class="section-head compact-section-head">
          <div>
            <h3>{{ selectedMeldung.titel }}</h3>
            <p class="section-subtitle">
              {{ selectedMeldung.datum }} · {{ typeLabel(selectedMeldung.typ) }} · {{ getFeldName(selectedMeldung.flaeche_id) }}
            </p>
          </div>
          <div class="item-actions">
            <button v-if="canWrite" type="button" class="btn btn-sm btn-ghost" @click="openEditForm">Bearbeiten</button>
            <button v-if="canWrite" type="button" class="btn btn-sm btn-danger" @click="removeMeldung">Löschen</button>
          </div>
        </div>

        <div class="meldung-badges">
          <span class="badge-status" :class="statusClass(selectedMeldung.status)">
            {{ statusLabel(selectedMeldung.status) }}
          </span>
          <span class="badge-status" :class="priorityClass(selectedMeldung.prioritaet)">
            {{ priorityLabel(selectedMeldung.prioritaet) }}
          </span>
        </div>

        <p class="meldung-description">{{ selectedMeldung.beschreibung || 'Keine Beschreibung hinterlegt.' }}</p>

        <div v-if="selectedMeldung.latitude || selectedMeldung.longitude" class="meta mb-085">
          Koordinaten: {{ selectedMeldung.latitude || '—' }}, {{ selectedMeldung.longitude || '—' }}
        </div>

        <div class="section-divider"></div>

        <div class="section-head compact-section-head">
          <div>
            <h3>Fotos</h3>
            <p class="section-subtitle">{{ fotos.length }} Bild{{ fotos.length === 1 ? '' : 'er' }}</p>
          </div>
          <div class="meldung-upload-buttons" v-if="canWrite">
            <label class="btn btn-ghost meldung-upload-button">
              Foto hochladen
              <input type="file" accept="image/*" multiple @change="uploadFoto" />
            </label>
            <button v-if="hasCamera" type="button" class="btn btn-ghost" @click="startCameraCapture">
              Foto aufnehmen
            </button>
          </div>
        </div>

        <div v-if="isFotosLoading" class="empty">Fotos werden geladen...</div>
        <div v-else-if="!fotos.length" class="empty">Noch keine Fotos vorhanden.</div>
        <div v-else class="meldung-photo-grid">
          <figure v-for="foto in fotos" :key="foto.id" class="meldung-photo-card">
            <img :src="fotoUrl(foto.id)" :alt="foto.filename" />
            <figcaption>
              <span>{{ foto.filename }}</span>
              <button v-if="canWrite" type="button" class="btn btn-sm btn-danger" @click="removeFoto(foto.id)">
                Löschen
              </button>
            </figcaption>
          </figure>
        </div>
      </div>

      <div v-else class="card empty meldungen-empty-detail">
        Wähle eine Meldung aus oder erstelle eine neue.
      </div>
    </section>
  </div>

  <Teleport to="body">
    <div v-if="showForm" class="modal-overlay open" @click.self="cancelForm">
      <form class="modal" @submit.prevent="saveMeldung">
        <h3>{{ form.id ? 'Meldung bearbeiten' : 'Neue Meldung' }}</h3>

        <div class="form-grid">
          <div class="field">
            <label for="meldung-datum">Datum</label>
            <input id="meldung-datum" v-model="form.datum" type="date" />
          </div>

          <div class="field">
            <label for="meldung-flaeche">Feld</label>
            <select id="meldung-flaeche" v-model="form.flaeche_id">
              <option value="">Kein Feld</option>
              <option v-for="feld in felderItems" :key="feld.id" :value="String(feld.id)">
                {{ feld.name || `Feld #${feld.id}` }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="meldung-typ">Typ</label>
            <select id="meldung-typ" v-model="form.typ">
              <option v-for="option in meta.typen" :key="option" :value="option">
                {{ typeLabel(option) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="meldung-prioritaet">Priorität</label>
            <select id="meldung-prioritaet" v-model="form.prioritaet">
              <option v-for="option in meta.prioritaet" :key="option" :value="option">
                {{ priorityLabel(option) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="meldung-status">Status</label>
            <select id="meldung-status" v-model="form.status">
              <option v-for="option in meta.status" :key="option" :value="option">
                {{ statusLabel(option) }}
              </option>
            </select>
          </div>

          <div class="field span-2">
            <label for="meldung-titel">Titel</label>
            <input id="meldung-titel" v-model="form.titel" placeholder="Kurze Beschreibung" />
          </div>

          <div class="field">
            <label for="meldung-latitude">Latitude</label>
            <input id="meldung-latitude" v-model="form.latitude" type="number" step="any" placeholder="optional" />
          </div>

          <div class="field">
            <label for="meldung-longitude">Longitude</label>
            <input id="meldung-longitude" v-model="form.longitude" type="number" step="any" placeholder="optional" />
          </div>

          <div class="field span-2">
            <label for="meldung-beschreibung">Beschreibung</label>
            <textarea id="meldung-beschreibung" v-model="form.beschreibung" rows="4" placeholder="Details zur Meldung"></textarea>
          </div>

          <div class="field span-2">
            <label for="meldung-fotos">Fotos</label>
            <div class="meldungen-file-inputs">
              <label class="btn btn-ghost meldung-upload-button">
                <span class="meldung-button-linebreak">Galerie<br />auswählen</span>
                <input id="meldung-fotos" type="file" accept="image/*" multiple @change="stageFormFotos" />
              </label>
              <button v-if="hasCamera" type="button" class="btn btn-ghost" @click="startCameraCapture">
                Foto aufnehmen
              </button>
            </div>
            <div v-if="pendingFotoNames.length" class="meldung-pending-files">
              {{ pendingFotoNames.join(', ') }}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" @click="cancelForm">Abbrechen</button>
          <button type="submit" class="btn btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Speichern...' : 'Speichern' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>

  <div v-if="showCameraCapture" class="meldung-camera-overlay">
    <div class="meldung-camera-dialog">
      <video ref="cameraVideo" autoplay playsinline muted class="meldung-camera-video"></video>
      <div class="meldung-camera-actions">
        <button type="button" class="btn btn-primary" @click="takeCameraPhoto">Foto machen</button>
        <button type="button" class="btn btn-ghost" @click="stopCameraCapture">Abbrechen</button>
      </div>
      <div v-if="cameraError" class="meldung-camera-error">{{ cameraError }}</div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import { toast } from '../app/appBridge.js';
import { apiDelete, apiGet, apiPost, apiPut, getCsrfToken } from '../app/api.js';

const typeLabels = {
  draht_abgerissen: 'Draht abgerissen',
  rebe_kaputt: 'Rebe kaputt',
  pfahl_kaputt: 'Pfahl kaputt',
  wildschaden: 'Wildschaden',
  hagelschaden: 'Hagelschaden',
  krankheit: 'Krankheit',
  schaedling: 'Schädling',
  freifeld: 'Freifeld',
  sonstiges: 'Sonstiges',
};

const statusLabels = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  erledigt: 'Erledigt',
  verworfen: 'Verworfen',
};

const priorityLabels = {
  niedrig: 'Niedrig',
  normal: 'Normal',
  hoch: 'Hoch',
  kritisch: 'Kritisch',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function resetFormState() {
  return {
    id: null,
    flaeche_id: '',
    datum: todayIso(),
    typ: 'sonstiges',
    titel: '',
    beschreibung: '',
    status: 'offen',
    prioritaet: 'normal',
    latitude: '',
    longitude: '',
  };
}

export default {
  name: 'MeldungenView',
  props: {
    activeTab: { type: String, default: '' },
    canWrite: { type: Boolean, default: false },
    felderItems: { type: Array, default: () => [] },
  },
  setup(props) {
    const items = ref([]);
    const selectedMeldung = ref(null);
    const fotos = ref([]);
    const isLoading = ref(false);
    const isFotosLoading = ref(false);
    const isSaving = ref(false);
    const showForm = ref(false);
    const pendingFotos = ref([]);
    const meta = reactive({
      typen: Object.keys(typeLabels),
      status: Object.keys(statusLabels),
      prioritaet: Object.keys(priorityLabels),
    });
    const filters = reactive({
      flaeche_id: '',
      status: '',
      typ: '',
    });
    const form = reactive(resetFormState());
    const hasCamera = ref(!!(navigator.mediaDevices?.getUserMedia));
    const showCameraCapture = ref(false);
    const cameraVideo = ref(null);
    const cameraStream = ref(null);
    const cameraError = ref('');

    const pendingFotoNames = computed(() => pendingFotos.value.map(file => file.name));

    const feldMap = computed(() => {
      const map = new Map();
      props.felderItems.forEach(item => map.set(String(item.id), item));
      return map;
    });

    function typeLabel(type) {
      return typeLabels[type] || type || '—';
    }

    function statusLabel(status) {
      return statusLabels[status] || status || '—';
    }

    function priorityLabel(priority) {
      return priorityLabels[priority] || priority || '—';
    }

    function statusClass(status) {
      return {
        offen: 'badge-warning',
        in_bearbeitung: 'badge-info',
        erledigt: 'badge-ok',
        verworfen: 'badge-negative',
      }[status] || 'badge-warning';
    }

    function priorityClass(priority) {
      return {
        niedrig: 'badge-ok',
        normal: 'badge-info',
        hoch: 'badge-warning',
        kritisch: 'badge-critical',
      }[priority] || 'badge-info';
    }

    function getFeldName(flaecheId) {
      if (!flaecheId) return 'Kein Feld';
      const feld = feldMap.value.get(String(flaecheId));
      return feld?.name || `Feld #${flaecheId}`;
    }

    function buildQuery() {
      const params = new URLSearchParams();
      if (filters.flaeche_id) params.set('flaeche_id', filters.flaeche_id);
      if (filters.status) params.set('status', filters.status);
      if (filters.typ) params.set('typ', filters.typ);
      params.set('limit', '200');
      return params.toString();
    }

    async function loadMeta() {
      try {
        const data = await apiGet('/api/meldungen/meta');
        meta.typen = Array.isArray(data.typen) ? data.typen : meta.typen;
        meta.status = Array.isArray(data.status) ? data.status : meta.status;
        meta.prioritaet = Array.isArray(data.prioritaet) ? data.prioritaet : meta.prioritaet;
      } catch (error) {
        console.error(error);
      }
    }

    async function loadMeldungen() {
      isLoading.value = true;
      try {
        const data = await apiGet(`/api/meldungen?${buildQuery()}`);
        items.value = Array.isArray(data) ? data : [];

        if (selectedMeldung.value && !items.value.some(item => item.id === selectedMeldung.value.id)) {
          selectedMeldung.value = null;
          fotos.value = [];
        }
      } catch (error) {
        console.error(error);
        toast('❌ Meldungen konnten nicht geladen werden');
      } finally {
        isLoading.value = false;
      }
    }

    async function selectMeldung(id) {
      showForm.value = false;
      try {
        selectedMeldung.value = await apiGet(`/api/meldungen/${id}`);
        fotos.value = Array.isArray(selectedMeldung.value.fotos) ? selectedMeldung.value.fotos : [];
        await loadFotos(id);
      } catch (error) {
        console.error(error);
        toast('❌ Meldung konnte nicht geladen werden');
      }
    }

    async function loadFotos(meldungId = selectedMeldung.value?.id) {
      if (!meldungId) return;
      isFotosLoading.value = true;
      try {
        const data = await apiGet(`/api/meldungen/${meldungId}/fotos`);
        fotos.value = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(error);
        toast('❌ Fotos konnten nicht geladen werden');
      } finally {
        isFotosLoading.value = false;
      }
    }

    function clearPendingFotos() {
      pendingFotos.value = [];
      const input = document.getElementById('meldung-fotos');
      if (input) input.value = '';
    }

    function applyForm(values = {}) {
      clearPendingFotos();
      Object.assign(form, resetFormState(), {
        id: values.id || null,
        flaeche_id: values.flaeche_id == null ? '' : String(values.flaeche_id),
        datum: values.datum || todayIso(),
        typ: values.typ || 'sonstiges',
        titel: values.titel || '',
        beschreibung: values.beschreibung || '',
        status: values.status || 'offen',
        prioritaet: values.prioritaet || 'normal',
        latitude: values.latitude == null ? '' : String(values.latitude),
        longitude: values.longitude == null ? '' : String(values.longitude),
      });
    }

    function openCreateForm() {
      selectedMeldung.value = null;
      fotos.value = [];
      applyForm();
      fillCoordinatesFromDevice();
      showForm.value = true;
    }

    function openEditForm() {
      if (!selectedMeldung.value) return;
      applyForm(selectedMeldung.value);
      fillCoordinatesFromDevice();
      showForm.value = true;
    }

    function cancelForm() {
      clearPendingFotos();
      showForm.value = false;
    }

    function readFieldValue(id) {
      return document.getElementById(id)?.value ?? '';
    }

    function syncFormFromDom() {
      Object.assign(form, {
        datum: readFieldValue('meldung-datum').trim(),
        flaeche_id: readFieldValue('meldung-flaeche'),
        typ: readFieldValue('meldung-typ').trim(),
        prioritaet: readFieldValue('meldung-prioritaet').trim(),
        status: readFieldValue('meldung-status').trim(),
        titel: readFieldValue('meldung-titel').trim(),
        latitude: readFieldValue('meldung-latitude'),
        longitude: readFieldValue('meldung-longitude'),
        beschreibung: readFieldValue('meldung-beschreibung'),
      });
    }

    function buildPayload() {
      return {
        flaeche_id: form.flaeche_id || null,
        datum: form.datum,
        typ: form.typ,
        titel: form.titel,
        beschreibung: form.beschreibung,
        status: form.status,
        prioritaet: form.prioritaet,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      };
    }

    function setFormCoordinates(latitude, longitude) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        form.latitude = String(parseFloat(lat.toFixed(6)));
        form.longitude = String(parseFloat(lon.toFixed(6)));
      }
    }

    function fillCoordinatesFromDevice() {
      if (!navigator.geolocation) return;
      if (form.latitude || form.longitude) return;

      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setFormCoordinates(latitude, longitude);
        },
        error => {
          console.warn('Geolocation nicht verfügbar:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    }

    async function detectCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        hasCamera.value = !!(navigator.mediaDevices?.getUserMedia);
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        hasCamera.value = devices.some(device => device.kind === 'videoinput') || !!(navigator.mediaDevices.getUserMedia);
      } catch (error) {
        console.warn('Kameraerkennung fehlgeschlagen:', error);
        hasCamera.value = !!(navigator.mediaDevices?.getUserMedia);
      }
    }

    async function startCameraCapture() {
      cameraError.value = '';
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraError.value = 'Kamera nicht verfügbar';
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraStream.value = stream;
        showCameraCapture.value = true;

        await nextTick();
        if (cameraVideo.value) {
          cameraVideo.value.srcObject = stream;
          cameraVideo.value.play().catch(() => {});
        }
      } catch (error) {
        cameraError.value = error.message || 'Kamerazugriff fehlgeschlagen';
      }
    }

    function stopCameraCapture() {
      if (cameraStream.value) {
        cameraStream.value.getTracks().forEach(track => track.stop());
        cameraStream.value = null;
      }
      showCameraCapture.value = false;
    }

    function takeCameraPhoto() {
      if (!cameraVideo.value) return;
      const video = cameraVideo.value;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (!blob) {
          cameraError.value = 'Foto konnte nicht aufgenommen werden';
          return;
        }

        const file = new File([blob], `meldung-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (showForm.value) {
          pendingFotos.value.push(file);
          toast('✅ Foto aufgenommen');
          stopCameraCapture();
          return;
        }

        if (selectedMeldung.value) {
          uploadFilesToMeldung(selectedMeldung.value.id, [file])
            .then(async () => {
              toast('✅ Foto hochgeladen');
              await loadFotos();
            })
            .catch(error => {
              console.error(error);
              toast(`❌ ${error.message || 'Foto konnte nicht hochgeladen werden'}`);
            })
            .finally(() => {
              stopCameraCapture();
            });
        }
      }, 'image/jpeg', 0.92);
    }

    function stageFormFotos(event) {
      pendingFotos.value = Array.from(event.target.files || []);
    }

    async function uploadFilesToMeldung(meldungId, files) {
      for (const file of files) {
        const payload = new FormData();
        payload.append('foto', file);

        const response = await fetch(`/api/meldungen/${meldungId}/fotos`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'X-CSRFToken': getCsrfToken(),
          },
          body: payload,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Foto konnte nicht hochgeladen werden');
        }
      }
    }

    async function saveMeldung() {
      syncFormFromDom();

      if (!form.typ && meta.typen.length) form.typ = meta.typen[0];
      if (!form.status) form.status = 'offen';
      if (!form.prioritaet) form.prioritaet = 'normal';

      if (!form.datum || !form.typ || !form.titel.trim()) {
        toast('❌ Bitte Datum, Typ und Titel ausfüllen');
        return;
      }

      isSaving.value = true;
      try {
        const payload = buildPayload();
        const saved = form.id
          ? await apiPut(`/api/meldungen/${form.id}`, payload)
          : await apiPost('/api/meldungen', payload);

        if (pendingFotos.value.length) {
          await uploadFilesToMeldung(saved.id, pendingFotos.value);
          clearPendingFotos();
        }

        toast('✅ Meldung gespeichert');
        showForm.value = false;
        await loadMeldungen();
        await selectMeldung(saved.id);
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message || 'Meldung konnte nicht gespeichert werden'}`);
      } finally {
        isSaving.value = false;
      }
    }

    async function removeMeldung() {
      if (!selectedMeldung.value || !confirm('Diese Meldung wirklich löschen?')) return;

      try {
        await apiDelete(`/api/meldungen/${selectedMeldung.value.id}`);
        toast('✅ Meldung gelöscht');
        selectedMeldung.value = null;
        fotos.value = [];
        await loadMeldungen();
      } catch (error) {
        console.error(error);
        toast('❌ Meldung konnte nicht gelöscht werden');
      }
    }

    async function uploadFoto(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (!files.length || !selectedMeldung.value) return;

      try {
        await uploadFilesToMeldung(selectedMeldung.value.id, files);
        toast(files.length === 1 ? '✅ Foto hochgeladen' : '✅ Fotos hochgeladen');
        await loadFotos();
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message || 'Foto konnte nicht hochgeladen werden'}`);
      }
    }

    async function removeFoto(fotoId) {
      if (!confirm('Dieses Foto wirklich löschen?')) return;

      try {
        await apiDelete(`/api/meldungen/fotos/${fotoId}`);
        toast('✅ Foto gelöscht');
        await loadFotos();
      } catch (error) {
        console.error(error);
        toast('❌ Foto konnte nicht gelöscht werden');
      }
    }

    function fotoUrl(fotoId) {
      return `/api/meldungen/fotos/${fotoId}/file`;
    }

    onMounted(async () => {
      await detectCamera();
      await loadMeta();
      await loadMeldungen();
    });

    onUnmounted(() => {
      stopCameraCapture();
    });

    watch(() => props.activeTab, (tab) => {
      if (tab === 'meldungen') {
        loadMeldungen();
      }
    });

    return {
      cancelForm,
      filters,
      form,
      fotoUrl,
      fotos,
      getFeldName,
      hasCamera,
      showCameraCapture,
      cameraVideo,
      cameraError,
      isFotosLoading,
      isLoading,
      isSaving,
      items,
      loadMeldungen,
      meta,
      openCreateForm,
      openEditForm,
      pendingFotoNames,
      priorityClass,
      priorityLabel,
      removeFoto,
      removeMeldung,
      saveMeldung,
      selectMeldung,
      selectedMeldung,
      stageFormFotos,
      startCameraCapture,
      stopCameraCapture,
      takeCameraPhoto,
      showForm,
      statusClass,
      statusLabel,
      typeLabel,
      uploadFoto,
    };
  },
};
</script>
