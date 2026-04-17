let kulturenItems = [];
let currentKulturEditId = null;

let bbchDraftItems = [];
let bbchRemovedIds = [];
let bbchTempRowId = 0;
let bbchOverviewItems = [];

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
  bbchOverviewItems = [];
  bbchRemovedIds = [];
  bbchTempRowId = 0;

  const modalTitle = $('modal-kultur-title');
  if (modalTitle) {
    modalTitle.textContent = 'Kultur hinzufügen';
  }

  renderBBCHList();
  renderBBCHOverview([]);
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
    addBtn.disabled = !isExisting;
  }
}

function renderBBCHList() {
  const list = $('bbch-list');
  const emptyState = $('bbch-empty-state');
  const editorTableWrap = $('bbch-editor-table-wrap');

  if (!list || !editorTableWrap) return;

  if (!bbchDraftItems.length) {
    list.innerHTML = '';
    editorTableWrap.classList.add('hidden');

    if (!Array.isArray(bbchOverviewItems) || !bbchOverviewItems.length) {
      if (emptyState) emptyState.classList.remove('hidden');
    }

    return;
  }

  editorTableWrap.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');

  list.innerHTML = bbchDraftItems.map(item => {
    const rowKey = item.id != null ? `id-${item.id}` : item.tempId;

    return `
      <tr data-bbch-key="${escapeHtml(rowKey)}">
        <td>
          <div class="bbch-input-wrap">
            <input
              type="text"
              class="bbch-input"
              value="${escapeHtml(item.code)}"
              data-bbch-field="code"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="z. B. 65"
            >
          </div>
        </td>
        <td>
          <div class="bbch-input-wrap">
            <input
              type="text"
              class="bbch-input"
              value="${escapeHtml(item.bezeichnung)}"
              data-bbch-field="bezeichnung"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="z. B. Vollblüte"
            >
          </div>
        </td>
        <td>
          <div class="bbch-input-wrap">
            <textarea
              class="bbch-input bbch-input--desc"
              data-bbch-field="beschreibung"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="Optionale Beschreibung"
            >${escapeHtml(item.beschreibung)}</textarea>
          </div>
        </td>
        <td>
          <div class="bbch-input-wrap">
            <input
              type="number"
              class="bbch-input"
              value="${escapeHtml(item.sortierung)}"
              data-bbch-field="sortierung"
              data-bbch-key="${escapeHtml(rowKey)}"
              placeholder="z. B. 65"
            >
          </div>
        </td>
        <td class="actions-cell">
          <div class="bbch-row-actions">
            <button
              type="button"
              class="btn btn-sm btn-primary"
              data-action="saveBBCHRow"
              data-bbch-key="${escapeHtml(rowKey)}"
            >
              Speichern
            </button>

            <button
              type="button"
              class="btn btn-sm btn-danger"
              data-action="removeBBCHRow"
              data-bbch-key="${escapeHtml(rowKey)}"
            >
              Löschen
            </button>
          </div>
        </td>
      </tr>
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
  updateBBCHSectionState();
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
  updateBBCHSectionState();

  if (!bbchDraftItems.length && (!bbchOverviewItems || !bbchOverviewItems.length)) {
    const emptyState = $('bbch-empty-state');
    if (emptyState) emptyState.classList.remove('hidden');
  }
}

function updateBBCHDraftField(key, field, value) {
  const index = findBBCHDraftIndexByKey(key);
  if (index === -1) return;

  bbchDraftItems[index][field] = value;
}

async function loadBBCHForKultur(kulturId) {
  try {
    const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
    bbchOverviewItems = Array.isArray(items) ? items.map(normalizeBBCHItem) : [];
    bbchDraftItems = [];
    bbchRemovedIds = [];

    renderBBCHOverview(bbchOverviewItems);
    renderBBCHList();
  } catch (err) {
    console.error(err);
    bbchOverviewItems = [];
    bbchDraftItems = [];
    bbchRemovedIds = [];

    renderBBCHOverview([]);
    renderBBCHList();
    toast('❌ BBCH-Codes konnten nicht geladen werden');
  }
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
    const isEdit = Boolean(currentKulturEditId);

    if (isEdit) {
      await apiPut(`/api/kulturen/${currentKulturEditId}`, payload);
      kulturId = currentKulturEditId;
    } else {
      const createResult = await apiPost('/api/kulturen', payload);

      await loadKulturen();
      kulturId = guessCreatedKulturId(createResult, payload);

      if (!kulturId) {
        throw new Error('Kultur wurde angelegt, aber die neue ID konnte nicht ermittelt werden.');
      }

      currentKulturEditId = kulturId;

      const modalTitle = $('modal-kultur-title');
      if (modalTitle) {
        modalTitle.textContent = 'Kultur bearbeiten';
      }

      await loadBBCHForKultur(kulturId);
      updateBBCHSectionState();
    }

    await loadKulturen();
    toast(isEdit ? '✅ Kultur gespeichert' : '✅ Kultur hinzugefügt');
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
  const saveBtn = $('btn-save-bbch');
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
  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', saveBBCH);
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
  const saveBtn = event.target.closest('[data-action="saveBBCHRow"]');
  if (saveBtn) {
    const key = saveBtn.getAttribute('data-bbch-key');
    if (!key) return;

    saveSingleBBCHRow(key);
    return;
  }

  const removeBtn = event.target.closest('[data-action="removeBBCHRow"]');
  if (removeBtn) {
    const key = removeBtn.getAttribute('data-bbch-key');
    if (!key) return;

    removeBBCHRow(key);
  }
});
document.addEventListener('click', async (event) => {
  const btn = event.target.closest('[data-action="deleteBBCHOverview"]');
  if (!btn) return;

  const id = btn.getAttribute('data-id');
  if (!id) return;

  if (!confirm('Diesen BBCH-Eintrag wirklich löschen?')) return;

  try {
    await apiDelete(`/api/bbch/${id}`);
    toast('✅ BBCH gelöscht');

    if (currentKulturEditId) {
      await loadBBCHForKultur(currentKulturEditId);
    }
  } catch (err) {
    toast(`❌ ${err.message}`);
  }
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
    bbchOverviewItems = [];
    renderBBCHOverview([]);
    return;
  }

  try {
    const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
    bbchOverviewItems = Array.isArray(items) ? items.map(normalizeBBCHItem) : [];
    renderBBCHOverview(bbchOverviewItems);
  } catch (err) {
    console.error(err);
    bbchOverviewItems = [];
    renderBBCHOverview([]);
    toast('❌ BBCH-Übersicht konnte nicht geladen werden');
  }
}

function renderBBCHOverview(items = bbchOverviewItems) {
  const container = $('bbch-overview');
  const emptyState = $('bbch-empty-state');

  if (!container) return;

  const sourceItems = Array.isArray(items) ? items : [];

  if (!sourceItems.length) {
    container.classList.add('hidden');
    container.innerHTML = '';

    if (!bbchDraftItems.length && emptyState) {
      emptyState.classList.remove('hidden');
    }

    return;
  }

  const sorted = [...sourceItems].sort((a, b) => {
    const aSort = a.sortierung === '' || a.sortierung == null
      ? Number.MAX_SAFE_INTEGER
      : Number(a.sortierung);

    const bSort = b.sortierung === '' || b.sortierung == null
      ? Number.MAX_SAFE_INTEGER
      : Number(b.sortierung);

    return aSort - bSort;
  });

  if (emptyState) {
    emptyState.classList.add('hidden');
  }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="table-wrap">
      <table class="table bbch-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Bezeichnung</th>
            <th>Beschreibung</th>
            <th>Sortierung</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(item => `
            <tr>
              <td>${escapeHtml(item.code || '—')}</td>
              <td>${escapeHtml(item.bezeichnung || '—')}</td>
              <td>${escapeHtml(item.beschreibung || '—')}</td>
              <td>${escapeHtml(
                item.sortierung === '' || item.sortierung == null
                  ? '—'
                  : String(item.sortierung)
              )}</td>
               <td>
                <button
                  class="btn btn-sm btn-danger"
                  data-action="deleteBBCHOverview"
                  data-id="${item.id}"
                >
                  Löschen
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function saveBBCH() {
  try {
    if (!currentKulturEditId) {
      toast('❌ Bitte zuerst die Kultur speichern');
      return;
    }

    if (!bbchDraftItems.length && !bbchRemovedIds.length) {
      toast('ℹ️ Keine BBCH-Änderungen vorhanden');
      return;
    }

    await persistBBCHDrafts(currentKulturEditId);

    bbchDraftItems = [];
    bbchRemovedIds = [];

    await loadBBCHForKultur(currentKulturEditId);
    updateBBCHSectionState();

    toast('✅ BBCH gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message || 'BBCH speichern fehlgeschlagen'}`);
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

async function saveSingleBBCHRow(key) {
  try {
    if (!currentKulturEditId) {
      toast('❌ Bitte zuerst die Kultur speichern');
      return;
    }

    const index = findBBCHDraftIndexByKey(key);
    if (index === -1) {
      toast('❌ BBCH-Zeile nicht gefunden');
      return;
    }

    const item = bbchDraftItems[index];

    if (!String(item.code || '').trim()) {
      toast('❌ Bitte einen BBCH-Code angeben');
      return;
    }

    if (!String(item.bezeichnung || '').trim()) {
      toast('❌ Bitte eine Bezeichnung angeben');
      return;
    }

    const payload = {
      kultur_id: currentKulturEditId,
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

    await loadBBCHForKultur(currentKulturEditId);

    toast('✅ BBCH gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message || 'BBCH speichern fehlgeschlagen'}`);
  }
}

initKulturBBCHEditor();