
/* ══════════════════════════════════════════════
   MAP PICKER  (Leaflet + OpenStreetMap)
   ══════════════════════════════════════════════ */
let _eoMap = null;
let _eoMarker = null;

// Default center: Germany center; overridden by existing coords on edit
const EO_MAP_DEFAULT = [51.1657, 10.4515];
const EO_MAP_DEFAULT_ZOOM = 6;
const EO_MAP_POINT_ZOOM = 15;

function eoInitMap() {
  // Already initialised — just invalidate size in case modal was hidden
  if (_eoMap) {
    setTimeout(() => _eoMap.invalidateSize(), 120);
    return;
  }

  _eoMap = L.map('eo-map', { zoomControl: true }).setView(EO_MAP_DEFAULT, EO_MAP_DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_eoMap);

  // Click on map → place / move marker & fill inputs
  _eoMap.on('click', (e) => {
    eoSetMapPoint(e.latlng.lat, e.latlng.lng);
  });
}

function eoSetMapPoint(lat, lng, panTo = true) {
  const latRounded = parseFloat(lat.toFixed(6));
  const lngRounded = parseFloat(lng.toFixed(6));

  // Update inputs
  const latInput = document.getElementById('eo-gpsRechtswert');
  const lngInput = document.getElementById('eo-gpsHochwert');
  if (latInput) latInput.value = latRounded;
  if (lngInput) lngInput.value = lngRounded;

  // Place or move draggable marker
  if (_eoMarker) {
    _eoMarker.setLatLng([latRounded, lngRounded]);
  } else {
    _eoMarker = L.marker([latRounded, lngRounded], { draggable: true }).addTo(_eoMap);
    _eoMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      eoSetMapPoint(pos.lat, pos.lng, false);
    });
  }

  if (panTo) _eoMap.setView([latRounded, lngRounded], Math.max(_eoMap.getZoom(), EO_MAP_POINT_ZOOM));
}

function eoSyncMapFromInputs() {
  const lat = parseFloat(document.getElementById('eo-gpsRechtswert')?.value);
  const lng = parseFloat(document.getElementById('eo-gpsHochwert')?.value);
  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    eoSetMapPoint(lat, lng);
  }
}

function eoResetMap() {
  if (_eoMarker) {
    _eoMarker.remove();
    _eoMarker = null;
  }
  if (_eoMap) {
    _eoMap.setView(EO_MAP_DEFAULT, EO_MAP_DEFAULT_ZOOM);
    setTimeout(() => _eoMap.invalidateSize(), 120);
  }
}

let einsatzorteItems = [];
let currentEinsatzortEditId = null;

function renderEinsatzorteList(items = einsatzorteItems) {
  const list = $('einsatzorte-list');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="empty">Noch keine Einsatzorte vorhanden.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="item">
      <div class="item-info">
        <div class="name">${escapeHtml(item.name || '—')}</div>
        <div class="meta">${escapeHtml(item.anwendungsbereich || '—')} · ${escapeHtml(item.geoTyp || '—')}</div>
        <div class="meta">${escapeHtml(item.flaecheVolumen || '—')} ${escapeHtml(item.einheit || '')}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" onclick="editEinsatzort(${item.id})">Bearbeiten</button>
        <button class="btn btn-sm btn-danger" onclick="removeEinsatzort(${item.id})">Löschen</button>
      </div>
    </div>
  `).join('');
}

async function loadEinsatzorte() {
  try {
    einsatzorteItems = await apiGet('/api/einsatzorte');
    const count = document.getElementById('eo-count');
    renderEinsatzorteList();
    if (count) count.textContent = String(einsatzorteItems.length);
    if (typeof loadExportSelections === 'function') {
      loadExportSelections();
    }
  } catch (err) {
    console.error(err);
    toast('❌ Einsatzorte konnten nicht geladen werden');
  }
}

function resetEinsatzortForm() {
  currentEinsatzortEditId = null;

  const defaultValues = {
    name: '',
    gpsRechtswert: '',
    gpsHochwert: '',
    anwendungsbereich: 'Freiland',
    geoTyp: 'GPS-Koordinaten',
    einheit: 'm2',
    flaecheVolumen: ''
  };

  Object.entries(defaultValues).forEach(([field, value]) => {
    const el = $(`eo-${field}`);
    if (el) el.value = value;
  });

  const modalTitle = $('modal-einsatzort-title');
  if (modalTitle) modalTitle.textContent = 'Einsatzort hinzufügen';
  eoResetMap();
}

function collectEinsatzortForm() {
  return {
    name: $('eo-name') ? $('eo-name').value.trim() : '',
    gpsRechtswert: $('eo-gpsRechtswert') ? $('eo-gpsRechtswert').value.trim() : '',
    gpsHochwert: $('eo-gpsHochwert') ? $('eo-gpsHochwert').value.trim() : '',
    anwendungsbereich: $('eo-anwendungsbereich') ? $('eo-anwendungsbereich').value.trim() : '',
    geoTyp: $('eo-geoTyp') ? $('eo-geoTyp').value.trim() : '',
    einheit: $('eo-einheit') ? $('eo-einheit').value.trim() : '',
    flaecheVolumen: $('eo-flaecheVolumen') ? $('eo-flaecheVolumen').value.trim() : ''
  };
}

function openEinsatzortModal() {
  resetEinsatzortForm();
  openModal('modal-einsatzort');
  setTimeout(eoInitMap, 80);  // slight delay so modal is visible before Leaflet measures it
}

async function editEinsatzort(id) {
  try {
    const item = await apiGet(`/api/einsatzorte/${id}`);
    currentEinsatzortEditId = id;

    ['name', 'gpsRechtswert', 'gpsHochwert', 'anwendungsbereich', 'geoTyp', 'einheit', 'flaecheVolumen'].forEach(field => {
      const el = $(`eo-${field}`);
      if (el) el.value = item[field] || '';
    });

    const modalTitle = $('modal-einsatzort-title');
    if (modalTitle) modalTitle.textContent = 'Einsatzort bearbeiten';

    openModal('modal-einsatzort');

    // Init map and fly to existing coordinates
    setTimeout(() => {
      eoInitMap();
      const lat = parseFloat(item.gpsRechtswert);
      const lng = parseFloat(item.gpsHochwert);
      if (!isNaN(lat) && !isNaN(lng)) eoSetMapPoint(lat, lng);
    }, 80);
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function saveEinsatzort() {
  try {
    const payload = collectEinsatzortForm();

    if (!payload.name) {
      toast('❌ Bitte einen Namen eingeben');
      return;
    }

    if (currentEinsatzortEditId) {
      await apiPut(`/api/einsatzorte/${currentEinsatzortEditId}`, payload);
      toast('✅ Einsatzort gespeichert');
    } else {
      await apiPost('/api/einsatzorte', payload);
      toast('✅ Einsatzort hinzugefügt');
    }

    closeModal('modal-einsatzort');
    resetEinsatzortForm();
    await loadEinsatzorte();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function removeEinsatzort(id) {
  if (!confirm('Diesen Einsatzort wirklich löschen?')) return;

  try {
    await apiDelete(`/api/einsatzorte/${id}`);
    toast('✅ Einsatzort gelöscht');
    await loadEinsatzorte();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}