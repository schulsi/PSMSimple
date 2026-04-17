let kulturenItems = [];
let currentKulturEditId = null;

let bbchDraftItems = [];
let bbchRemovedIds = [];
let bbchTempRowId = 0;

function renderKulturenList(items = kulturenItems) {
  const list = $('kulturen-list');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="empty">Noch keine Kulturen vorhanden.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="item">
      <div class="item-info">
        <div class="name">${escapeHtml(item.name || '—')}</div>
        <div class="meta">EPPO-Code: ${escapeHtml(item.eppoCode || '—')}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" data-action="editKultur" data-id="${item.id}">Bearbeiten</button>
        <button class="btn btn-sm btn-danger" data-action="removeKultur" data-id="${item.id}">Löschen</button>
      </div>
    </div>
  `).join('');
}

async function loadKulturen() {
  try {
    kulturenItems = await apiGet('/api/kulturen');
    const count = $('kult-count');

    renderKulturenList();

    if (count) {
      count.textContent = String(kulturenItems.length);
    }

    if (typeof loadExportSelections === 'function') {
      loadExportSelections();
    }
  } catch (err) {
    console.error(err);
    toast('❌ Kulturen konnten nicht geladen werden');
  }
}

function resetKulturForm() {
  currentKulturEditId = null;

  if ($('k-name')) $('k-name').value = '';
  if ($('k-eppoCode')) $('k-eppoCode').value = '';

  bbchDraftItems = [];
  bbchRemovedIds = [];
  bbchTempRowId = 0;

  const modalTitle = $('modal-kultur-title');
  if (modalTitle) {
    modalTitle.textContent = 'Kultur hinzufügen';
  }

  renderBBCHList();
  renderBBCHOverview();
  updateBBCHSectionState();
}

function collectKulturForm() {
  return {
    name: $('k-name') ? $('k-name').value.trim() : '',
    eppoCode: $('k-eppoCode') ? $('k-eppoCode').value.trim() : ''
  };
}

function normalizeBBCHItem(item = {}) {
  return {
    id: item.id ?? null,
    tempId: item.tempId ?? `tmp-${++bbchTempRowId}`,
    kultur_id: item.kultur_id ?? currentKulturEditId ?? null,
    code: String(item.code ?? '').trim(),
    bezeichnung: String(item.bezeichnung ?? '').trim(),
    beschreibung: String(item.beschreibung ?? '').trim(),
    sortierung: item.sortierung === null || item.sortierung === undefined || item.sortierung === ''
      ? ''
      : String(item.sortierung)
  };
}

function updateBBCHSectionState() {
  const editorSection = $('bbch-editor-section');
  const addBtn = $('btn-add-bbch-row');

  if (!editorSection) return;

  const isExisting = Boolean(currentKulturEditId);

  editorSection.dataset.mode = isExisting ? 'edit' : 'create';

  if (addBtn) {
    addBtn.disabled = false;
  }
}

function renderBBCHList() {
  const list = $('bbch-list');
  const emptyState = $('bbch-empty-state');

  if (!list) return;

  if (!bbchDraftItems.length) {
    list.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  list.innerHTML = bbchDraftItems.map((item, index) => {
    const rowKey = item.id != null ? `id-${item.id}` : item.tempId;

    return `
      <div class="card mb-075 bbch-row" data-bbch-key="${escapeHtml(rowKey)}">
        <div class="form-grid">
          <div class="field">
            <label>Code <span class="danger-text">*</span></label>
            <input
              type="text"
              value="${escapeHtml(item.code)}"
              data-bbch-field="code"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="z. B. 65"
            >
          </div>

          <div class="field">
            <label>Sortierung</label>
            <input
              type="number"
              value="${escapeHtml(item.sortierung)}"
              data-bbch-field="sortierung"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="z. B. 65"
            >
          </div>

          <div class="field span-2">
            <label>Bezeichnung <span class="danger-text">*</span></label>
            <input
              type="text"
              value="${escapeHtml(item.bezeichnung)}"
              data-bbch-field="bezeichnung"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="z. B. Vollblüte"
            >
          </div>

          <div class="field span-2">
            <label>Beschreibung</label>
            <input
              type="text"
              value="${escapeHtml(item.beschreibung)}"
              data-bbch-field="beschreibung"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="Optionale Beschreibung"
            >
          </div>
        </div>

        <div class="mt-05 flex-end">
          <button
            type="button"
            class="btn btn-sm btn-danger"
            data-action="removeBBCHRow"
            data-bbch-key="${escapeHtml(rowKey)}"
          >
            Löschen
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getBBCHKey(item) {
  return item.id != null ? `id-${item.id}` : item.tempId;
}

function findBBCHDraftIndexByKey(key) {
  return bbchDraftItems.findIndex(item => getBBCHKey(item) === key);
}

function addBBCHRow(initialData = {}) {
  bbchDraftItems.push(normalizeBBCHItem(initialData));
  renderBBCHList();
  renderBBCHOverview()
}

function removeBBCHRow(key) {
  const index = findBBCHDraftIndexByKey(key);
  if (index === -1) return;

  const item = bbchDraftItems[index];

  if (item.id != null) {
    bbchRemovedIds.push(item.id);
  }

  bbchDraftItems.splice(index, 1);
  renderBBCHList();
  renderBBCHOverview()
}

function updateBBCHDraftField(key, field, value) {
  const index = findBBCHDraftIndexByKey(key);
  if (index === -1) return;

  bbchDraftItems[index][field] = value;
}

async function loadBBCHForKultur(kulturId) {
  try {
    const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
    bbchDraftItems = Array.isArray(items) ? items.map(normalizeBBCHItem) : [];
    bbchRemovedIds = [];
    renderBBCHList();
    renderBBCHOverview()
  } catch (err) {
    console.error(err);
    bbchDraftItems = [];
    bbchRemovedIds = [];
    renderBBCHList();
    renderBBCHOverview()
    toast('❌ BBCH-Codes konnten nicht geladen werden');
  }
}

function validateBBCHDrafts() {
  for (const item of bbchDraftItems) {
    if (!String(item.code || '').trim()) {
      return 'Bitte bei allen BBCH-Einträgen einen Code angeben';
    }

    if (!String(item.bezeichnung || '').trim()) {
      return 'Bitte bei allen BBCH-Einträgen eine Bezeichnung angeben';
    }
  }

  return '';
}

async function persistBBCHDrafts(kulturId) {
  const validationError = validateBBCHDrafts();
  if (validationError) {
    throw new Error(validationError);
  }

  for (const bbchId of bbchRemovedIds) {
    await apiDelete(`/api/bbch/${bbchId}`);
  }

  const sortedDrafts = [...bbchDraftItems].sort((a, b) => {
    const aSort = a.sortierung === '' ? Number.MAX_SAFE_INTEGER : Number(a.sortierung);
    const bSort = b.sortierung === '' ? Number.MAX_SAFE_INTEGER : Number(b.sortierung);
    return aSort - bSort;
  });

  for (const item of sortedDrafts) {
    const payload = {
      kultur_id: kulturId,
      code: String(item.code || '').trim(),
      bezeichnung: String(item.bezeichnung || '').trim(),
      beschreibung: String(item.beschreibung || '').trim(),
      sortierung: item.sortierung === '' ? null : Number(item.sortierung)
    };

    if (item.id != null) {
      await apiPut(`/api/bbch/${item.id}`, payload);
    } else {
      await apiPost('/api/bbch', payload);
    }
  }

  bbchRemovedIds = [];
}

function guessCreatedKulturId(createResult, payload) {
  if (createResult && typeof createResult === 'object') {
    if (createResult.id) return createResult.id;
    if (createResult.kultur && createResult.kultur.id) return createResult.kultur.id;
    if (createResult.data && createResult.data.id) return createResult.data.id;
  }

  const exactMatch = [...kulturenItems]
    .reverse()
    .find(item =>
      String(item.name || '').trim() === String(payload.name || '').trim() &&
      String(item.eppoCode || '').trim() === String(payload.eppoCode || '').trim()
    );

  return exactMatch ? exactMatch.id : null;
}

function openKulturModal() {
  resetKulturForm();
  openModal('modal-kultur');
}

async function editKultur(id) {
  try {
    const item = await apiGet(`/api/kulturen/${id}`);
    currentKulturEditId = id;

    if ($('k-name')) $('k-name').value = item.name || '';
    if ($('k-eppoCode')) $('k-eppoCode').value = item.eppoCode || '';

    const modalTitle = $('modal-kultur-title');
    if (modalTitle) {
      modalTitle.textContent = 'Kultur bearbeiten';
    }

    updateBBCHSectionState();

    openModal('modal-kultur');

    await loadBBCHOverviewFromApi(id);
    await loadBBCHForKultur(id);
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message || 'Kultur konnte nicht geladen werden'}`);
  }
}

async function saveKultur() {
  try {
    const payload = collectKulturForm();

    if (!payload.name) {
      toast('❌ Bitte einen Namen eingeben');
      return;
    }

    if (!payload.eppoCode) {
      toast('❌ Bitte einen EPPO-Code eingeben');
      return;
    }

    let kulturId = currentKulturEditId;
    const wasEdit = Boolean(currentKulturEditId);

    if (currentKulturEditId) {
      await apiPut(`/api/kulturen/${currentKulturEditId}`, payload);
      kulturId = currentKulturEditId;
    } else {
      const createResult = await apiPost('/api/kulturen', payload);

      await loadKulturen();
      kulturId = guessCreatedKulturId(createResult, payload);

      if (!kulturId) {
        throw new Error('Kultur wurde angelegt, aber die neue ID konnte nicht ermittelt werden. Bitte Kultur erneut öffnen und BBCH speichern.');
      }
    }

    await persistBBCHDrafts(kulturId);
     await loadBBCHOverviewFromApi(kulturId); 

    closeModal('modal-kultur');
    resetKulturForm();
    await loadKulturen();

    toast(currentKulturEditId ? '✅ Kultur gespeichert' : '✅ Kultur hinzugefügt');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message || 'Speichern fehlgeschlagen'}`);
  }
}

async function removeKultur(id) {
  if (!confirm('Diese Kultur wirklich löschen?')) return;

  try {
    await apiDelete(`/api/kulturen/${id}`);
    toast('✅ Kultur gelöscht');
    await loadKulturen();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message || 'Löschen fehlgeschlagen'}`);
  }
}

function initKulturBBCHEditor() {
  const addBtn = $('btn-add-bbch-row');
  const list = $('bbch-list');

  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => {
      addBBCHRow({
        code: '',
        bezeichnung: '',
        beschreibung: '',
        sortierung: ''
      });
    });
  }

  if (list && !list.dataset.bound) {
    list.dataset.bound = '1';

    list.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const key = target.getAttribute('data-bbch-key');
      const field = target.getAttribute('data-bbch-field');

      if (!key || !field) return;

      updateBBCHDraftField(key, field, target.value);
    });

    list.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="removeBBCHRow"]');
      if (!btn) return;

      const key = btn.getAttribute('data-bbch-key');
      if (!key) return;

      removeBBCHRow(key);
    });
  }
}

function normalizeBBCHOverviewItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    return [data];
  }

  return [];
}

async function loadBBCHOverviewFromApi(kulturId) {
  const container = $('bbch-overview');
  if (!container) return;

  if (!kulturId) {
    renderBBCHOverview([]);
    return;
  }

  try {
    const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
    bbchOverviewItems = Array.isArray(items) ? items : [];
    console.log(items)
    const normalizedItems = normalizeBBCHOverviewItems(items)
    console.log(normalizedItems)
    renderBBCHOverview(normalizedItems);
  } catch (err) {
    console.error(err);
    bbchOverviewItems = [];
    renderBBCHOverview();
    toast('❌ BBCH-Übersicht konnte nicht geladen werden');
  }
}

function renderBBCHOverview() {
  const container = $('bbch-overview');
  if (!container) return;

  if (!Array.isArray(bbchOverviewItems) || !bbchOverviewItems.length) {
    console.log("Test")
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const sorted = [...bbchOverviewItems].sort((a, b) => {
    const aSort = a.sortierung ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sortierung ?? Number.MAX_SAFE_INTEGER;
    return aSort - bSort;
  });

  container.classList.remove('hidden');
  container.innerHTML = sorted.map(item => `
    <div class="bbch-chip">
      <span class="code">${escapeHtml(item.code || '—')}</span>
      <span class="label">${escapeHtml(item.bezeichnung || '')}</span>
    </div>
  `).join('');
}

initKulturBBCHEditor();