let kulturenItems = [];
let currentKulturEditId = null;

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
        <button class="btn btn-sm btn-ghost" onclick="editKultur(${item.id})">Bearbeiten</button>
        <button class="btn btn-sm btn-danger" onclick="removeKultur(${item.id})">Löschen</button>
      </div>
    </div>
  `).join('');
}

async function loadKulturen() {
  try {
    kulturenItems = await apiGet('/api/kulturen');
    renderKulturenList();
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

  const modalTitle = $('modal-kultur-title');
  if (modalTitle) modalTitle.textContent = 'Kultur hinzufügen';
}

function collectKulturForm() {
  return {
    name: $('k-name') ? $('k-name').value.trim() : '',
    eppoCode: $('k-eppoCode') ? $('k-eppoCode').value.trim() : ''
  };
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
    if (modalTitle) modalTitle.textContent = 'Kultur bearbeiten';

    openModal('modal-kultur');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function saveKultur() {
  try {
    const payload = collectKulturForm();

    if (!payload.name) {
      toast('❌ Bitte einen Namen eingeben');
      return;
    }

    if (currentKulturEditId) {
      await apiPut(`/api/kulturen/${currentKulturEditId}`, payload);
      toast('✅ Kultur gespeichert');
    } else {
      await apiPost('/api/kulturen', payload);
      toast('✅ Kultur hinzugefügt');
    }

    closeModal('modal-kultur');
    resetKulturForm();
    await loadKulturen();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
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
    toast(`❌ ${err.message}`);
  }
}