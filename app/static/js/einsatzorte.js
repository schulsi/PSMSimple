/* ══════════════════════════════════════════════
   MAP PICKER  (Leaflet + OpenStreetMap)
   ══════════════════════════════════════════════ */
/* Leaflet Marker Fix (LOCAL PATHS) */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/media/marker-icon-2x.png',
  iconUrl: '/media/marker-icon.png',
  shadowUrl: '/media/marker-shadow.png'
});

let _eoMap = null;
let _eoMarker = null;
let _eoMapSelection = null; // { lat, lng } confirmed in map modal

const EO_MAP_DEFAULT     = [51.1657, 10.4515]; // Germany center
const EO_MAP_DEFAULT_ZOOM = 6;
const EO_MAP_POINT_ZOOM   = 15;

function openMapModal() {
  openModal('modal-map');

  setTimeout(() => {
    if (!_eoMap) {
      apiGet('/api/betrieb')
        .then(betrieb => {
          const plz = betrieb.plz;

          if (!plz) {
            throw new Error('Keine PLZ gefunden');
          }

          return apiGet(`/api/einsatzorte/cord2plz/${encodeURIComponent(plz)}`);
        })
        .then(data => {
          let center = EO_MAP_DEFAULT;
          let zoom = EO_MAP_DEFAULT_ZOOM;

          const lat = parseFloat(data.lat);
          const lng = parseFloat(data.lon);

          if (!isNaN(lat) && !isNaN(lng)) {
            center = [lat, lng];
            zoom = EO_MAP_POINT_ZOOM;
          } else {
            toast('❌ PLZ nicht gefunden');
          }

          _eoMap = L.map('eo-map', { zoomControl: true }).setView(center, zoom);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(_eoMap);

          _eoMap.on('click', (e) => _eoMapSetPoint(e.latlng.lat, e.latlng.lng));
          _eoMap.invalidateSize();

          if (!isNaN(lat) && !isNaN(lng)) {
            _eoMapSetPoint(lat, lng);
          }
        })
        .catch(err => {
          console.error(err);
          toast(`❌ ${err.message}`);

          _eoMap = L.map('eo-map', { zoomControl: true })
            .setView(EO_MAP_DEFAULT, EO_MAP_DEFAULT_ZOOM);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(_eoMap);

          _eoMap.on('click', (e) => _eoMapSetPoint(e.latlng.lat, e.latlng.lng));
          _eoMap.invalidateSize();
        });

      return;
    }

    _eoMap.invalidateSize();

    const lat = parseFloat(document.getElementById('eo-gpsRechtswert')?.value);
    const lng = parseFloat(document.getElementById('eo-gpsHochwert')?.value);

    if (!isNaN(lat) && !isNaN(lng)) {
      _eoMapSetPoint(lat, lng);
    }
  }, 80);
}

function closeMapModal() {
  closeModal('modal-map');
}

function _eoMapSetPoint(lat, lng) {
  const latR = parseFloat(lat.toFixed(6));
  const lngR = parseFloat(lng.toFixed(6));

  _eoMapSelection = { lat: latR, lng: lngR };

  // Update coord display bar
  const latEl = document.getElementById('map-lat-display');
  const lngEl = document.getElementById('map-lng-display');
  if (latEl) latEl.textContent = latR;
  if (lngEl) lngEl.textContent = lngR;

  // Enable confirm button
  const btn = document.getElementById('map-confirm-btn');
  if (btn) btn.disabled = false;

  // Place / move draggable marker
  if (_eoMarker) {
    _eoMarker.setLatLng([latR, lngR]);
  } else {
    _eoMarker = L.marker([latR, lngR], { draggable: true }).addTo(_eoMap);
    _eoMarker.on('dragend', (e) => {
      const p = e.target.getLatLng();
      _eoMapSetPoint(p.lat, p.lng);
    });
  }

  _eoMap.setView([latR, lngR], Math.max(_eoMap.getZoom(), EO_MAP_POINT_ZOOM));
}

function confirmMapSelection() {
  if (!_eoMapSelection) return;

  const latInput = document.getElementById('eo-gpsRechtswert');
  const lngInput = document.getElementById('eo-gpsHochwert');
  if (latInput) latInput.value = _eoMapSelection.lat;
  if (lngInput) lngInput.value = _eoMapSelection.lng;

  closeMapModal();
  toast('📍 Koordinaten übernommen');
}

function _eoResetMap() {
  if (_eoMarker) { _eoMarker.remove(); _eoMarker = null; }
  _eoMapSelection = null;
  const latEl = document.getElementById('map-lat-display');
  const lngEl = document.getElementById('map-lng-display');
  if (latEl) latEl.textContent = '—';
  if (lngEl) lngEl.textContent = '—';
  const btn = document.getElementById('map-confirm-btn');
  if (btn) btn.disabled = true;
  if (_eoMap) _eoMap.setView(EO_MAP_DEFAULT, EO_MAP_DEFAULT_ZOOM);
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
        <button class="btn btn-sm btn-ghost" data-action="editEinsatzort" data-id="${item.id}">Bearbeiten</button>
        <button class="btn btn-sm btn-danger" data-action="removeEinsatzort" data-id="${item.id}">Löschen</button>
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
  _eoResetMap();
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
    // Pre-load map marker if coords exist (lazy — map opened on demand)
    const _lat = parseFloat(item.gpsRechtswert);
    const _lng = parseFloat(item.gpsHochwert);
    if (!isNaN(_lat) && !isNaN(_lng)) _eoMapSelection = { lat: _lat, lng: _lng };
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