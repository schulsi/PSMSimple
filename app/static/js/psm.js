let psmItems = [];
let currentPsmEditId = null;
let psmSearchTimer = null;
let psmInfoLoading = false;

function setPSMInfoLoading(isLoading) {
  psmInfoLoading = isLoading;

  const saveBtn = $('psm-save-btn');
  if (saveBtn) {
    saveBtn.disabled = isLoading;
    saveBtn.textContent = isLoading ? 'Lade Daten ...' : 'Speichern';
  }

  const nameInput = $('psm-name');
  if (nameInput) {
    nameInput.disabled = isLoading;
  }
}

function renderPSMList(items = psmItems) {
  const list = $('psm-list');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="empty">Noch keine Pflanzenschutzmittel vorhanden.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="item">
      <div class="item-info">
        <div class="name">${escapeHtml(item.name || '—')}</div>
        <div class="meta">Zul.-Nr.: ${escapeHtml(item.zulassungsnr || '—')}</div>
        <div class="meta">Wirkstoffe: ${escapeHtml(item.wirkstoffe || '—')}</div>
        <div class="meta">Einheit: ${escapeHtml(item.aufwandEinheit || '—')} · Bienen: ${escapeHtml(item.bienen || '—')}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" data-action="editPSM" data-id="${item.id}">Bearbeiten</button>
        <button class="btn btn-sm btn-danger" data-action="removePSM" data-id="${item.id}">Löschen</button>
      </div>
    </div>
  `).join('');
}

async function loadPSM() {
  try {
    psmItems = await apiGet('/api/psm');
    const list = document.getElementById('psm-list');
    renderPSMList();
    const count = document.getElementById('psm-count');
    if (count) count.textContent = String(psmItems.length);
    if (typeof loadExportSelections === 'function') {
      loadExportSelections();
    }
  } catch (err) {
    console.error(err);
    toast('❌ Pflanzenschutzmittel konnten nicht geladen werden');
  }
}

async function resetPSMForm() {
  currentPsmEditId = null;
  setPSMInfoLoading(false);
  const payload = await apiGet('/api/app/settings');

  const fields = ['name', 'zulassungsnr', 'wirkstoffe', 'aufwandEinheit', 'bienen'];
  fields.forEach(field => {
    const el = $(`psm-${field}`);
    if (el) el.value = '';
  });
  console.log(payload.inventory_warn_default)
  if($('psm-warnung_lager')) {
    $('psm-warnung_lager').value = payload.inventory_warn_default ?? ''; 
  }
  if($('psm-min_lager')) {
    $('psm-min_lager').value = payload.inventory_min_default ?? ''; 
  }

  const modalTitle = $('modal-psm-title');
  if (modalTitle) modalTitle.textContent = 'Pflanzenschutzmittel hinzufügen';
}

function collectPSMForm() {
  return {
    name: $('psm-name') ? $('psm-name').value.trim() : '',
    zulassungsnr: $('psm-zulassungsnr') ? $('psm-zulassungsnr').value.trim() : '',
    wirkstoffe: $('psm-wirkstoffe') ? $('psm-wirkstoffe').value.trim() : '',
    aufwandEinheit: $('psm-aufwandEinheit') ? $('psm-aufwandEinheit').value.trim() : '',
    bienen: $('psm-bienen') ? $('psm-bienen').value.trim() : '',
    lager_einheit: $('psm-lager_einheit') ? $('psm-lager_einheit').value.trim() : '',
    min_lager: $('psm-min_lager') ? $('psm-min_lager').value.trim() : '',
    warnung_lager: $('psm-warnung_lager') ? $('psm-warnung_lager').value.trim() : '',
  };
}

function openPSMModal() {
  resetPSMForm();
  openModal('modal-psm');
}

async function editPSM(id) {
  try {
    const item = await apiGet(`/api/psm/${id}`);
    currentPsmEditId = id;

    if ($('psm-name')) $('psm-name').value = item.name || '';
    if ($('psm-zulassungsnr')) $('psm-zulassungsnr').value = item.zulassungsnr || '';
    if ($('psm-wirkstoffe')) $('psm-wirkstoffe').value = item.wirkstoffe || '';
    if ($('psm-aufwandEinheit')) $('psm-aufwandEinheit').value = item.aufwandEinheit || '';
    if ($('psm-bienen')) $('psm-bienen').value = item.bienen || '';
    const modalTitle = $('modal-psm-title');
    if (modalTitle) modalTitle.textContent = 'Pflanzenschutzmittel bearbeiten';

    openModal('modal-psm');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function savePSM() {
  try {
    if (psmInfoLoading) {
      toast('⚠️ Bitte warten, bis die Daten geladen sind');
      return;
    }
    const payload = collectPSMForm();

    if (!payload.name) {
      toast('❌ Bitte einen Namen eingeben');
      return;
    }

    if (currentPsmEditId) {
      await apiPut(`/api/psm/${currentPsmEditId}`, payload);
      toast('✅ Pflanzenschutzmittel gespeichert');
    } else {
      try {
        await apiPost('/api/psm', payload);
        toast('✅ Pflanzenschutzmittel hinzugefügt');
      } catch (err) {
        if (err.message.includes('existiert bereits')) {
          toast('⚠️ Mittel existiert bereits');
        } else {
          throw err;
        }
      }
    }

    closeModal('modal-psm');
    resetPSMForm();
    await loadPSM();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function removePSM(id) {
  if (!confirm('Dieses Pflanzenschutzmittel wirklich löschen?')) return;

  try {
    await apiDelete(`/api/psm/${id}`);
    toast('✅ Pflanzenschutzmittel gelöscht');
    await loadPSM();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function searchPSMAutocomplete(term) {
  if (!term || term.trim().length < 2) {
    renderPSMSearchResults([]);
    return;
  }

  try {
    const results = await apiGet(`/search/psm/${encodeURIComponent(term.trim())}`);
    renderPSMSearchResults(results || []);
  } catch (err) {
    console.error(err);
    renderPSMSearchResults([]);
  }
}

function renderPSMSearchResults(items) {
  const resultsBox = $('psm-search-results');
  if (!resultsBox) return;

  if (!items.length) {
    resultsBox.innerHTML = `<div class="autocomplete-empty">Keine Treffer</div>`;
    resultsBox.classList.add('show');
    return;
  }

  resultsBox.innerHTML = items.map(item => `
    <div class="autocomplete-item" data-action="selectPSMSearchResult" data-name="${escapeHtml(item.name)}" data-kennr="${escapeHtml(item.kennr)}">
      ${escapeHtml(item.name)} <span class="text-muted">(${escapeHtml(item.kennr || '')})</span>
    </div>
  `).join('');

  resultsBox.classList.add('show');
}

async function selectPSMSearchResult(name, kennr) {
  if ($('psm-name')) $('psm-name').value = name;
  if ($('psm-zulassungsnr')) $('psm-zulassungsnr').value = kennr;

  const resultsBox = $('psm-search-results');
  if (resultsBox) resultsBox.classList.remove('show');

  setPSMInfoLoading(true);
  try {
    const info = await apiGet(`/api/psm/info/${encodeURIComponent(kennr)}`);

    if ($('psm-zulassungsnr')) $('psm-zulassungsnr').value = info.zulassungsnr || kennr;
    if ($('psm-wirkstoffe')) $('psm-wirkstoffe').value = info.wirkstoffe || '';
    if ($('psm-bienen')) {
      const beeClass = (info.bienenfreundlichkeit || '').split(',')[0].trim();
      if (['B1', 'B2', 'B3', 'B4'].includes(beeClass)) {
        $('psm-bienen').value = beeClass;
      }
    }
    if ($('psm-aufwandEinheit')) $('psm-aufwandEinheit').value = info.aufwand_einheit || '';
    const [einheit, ...rest] = info.aufwand_einheit.split('/')
    if($('psm-lager_einheit')) $('psm-lager_einheit').value = einheit || '';
  } catch (err) {
    console.error(err);
    toast('⚠️ Wirkstoffdaten konnten nicht geladen werden');
  } finally {
    setPSMInfoLoading(false);
  }
}

function initPSMSearch() {
  const input = $('psm-name');
  const resultsBox = $('psm-search-results');

  if (!input || !resultsBox) return;

  input.addEventListener('input', () => {
    clearTimeout(psmSearchTimer);
    psmSearchTimer = setTimeout(() => {
      searchPSMAutocomplete(input.value);
    }, 100);
  });

  document.addEventListener('click', (event) => {
    const insideInput = input.contains(event.target);
    const insideResults = resultsBox.contains(event.target);
    if (!insideInput && !insideResults) {
      resultsBox.classList.remove('show');
    }
  });
}