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
    renderEinsatzorteList();
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