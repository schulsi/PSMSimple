let lastSavedHistorySignature = null;
const exportBBCHCache = {};

function getPayloadSignature(payload) {
  return JSON.stringify(payload);
}
async function getBBCHOptionsForKultur(kulturId) {
  if (exportBBCHCache[kulturId]) {
    return exportBBCHCache[kulturId];
  }

  const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
  const normalized = Array.isArray(items) ? items : [];

  normalized.sort((a, b) => {
    const aSort = a.sortierung ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sortierung ?? Number.MAX_SAFE_INTEGER;
    return aSort - bSort;
  });

  exportBBCHCache[kulturId] = normalized;
  return normalized;
}

function renderExportSelectionList(containerId, items, type, emptyMessage = 'Keine Einträge vorhanden.') {
  const container = $(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    if (type === 'psm') {
      return `
        <div class="exp-item" id="exp-psm-${item.id}">
          <label class="exp-item-header">
            <input type="checkbox" class="exp-psm-check" data-id="${item.id}" data-action="toggleExpItem" data-type="psm">
            <div>
              <div class="ci-name">${escapeHtml(item.name || '—')}</div>
              <div class="ci-meta">${escapeHtml(item.zulassungsnr || '—')} · ${escapeHtml(item.aufwandEinheit || '—')}</div>
            </div>
          </label>
          <div class="exp-item-extra">
            <label>Aufwandsmenge</label>
            <input type="number" class="exp-psm-amount" data-id="${item.id}" placeholder="z. B. 1,5">
          </div>
        </div>
      `;
    }

    if (type === 'einsatzort') {
      return `
        <div class="exp-item" id="exp-einsatzort-${item.id}">
          <label class="exp-item-header">
            <input type="checkbox" class="exp-einsatzort-check" data-id="${item.id}" data-ort-id="${item.ort_id || ''}" data-action="toggleExpItem" data-type="einsatzort">
            <div>
              <div class="ci-name">${escapeHtml(item.name || '—')}</div>
              <div class="ci-meta">${escapeHtml(item.anwendungsbereich || '—')} · ${escapeHtml(item.flaecheVolumen || '—')} ${escapeHtml(item.einheit || '')}</div>
            </div>
          </label>
        </div>
      `;
    }

    if (type === 'kultur') {
      return `
        <div class="exp-item" id="exp-kultur-${item.id}">
          <label class="exp-item-header">
            <input type="checkbox" class="exp-kultur-check" data-id="${item.id}" data-action="toggleExpItem" data-type="kultur">
            <div>
              <div class="ci-name">${escapeHtml(item.name || '—')}</div>
              <div class="ci-meta">${escapeHtml(item.eppoCode || '—')}</div>
            </div>
          </label>
          <div class="exp-item-extra">
            <label>BBCH-Code</label>
            <div class="autocomplete-wrap exp-bbch-autocomplete">
              <input
                type="text"
                class="exp-kultur-bbch"
                data-id="${item.id}"
                data-kultur-name="${escapeHtml(item.name || '')}"
                placeholder="Code oder Beschreibung suchen"
                autocomplete="off"
              >
              <div class="autocomplete-results exp-kultur-bbch-results" data-id="${item.id}"></div>
            </div>
            <div class="exp-kultur-bbch-hint text-muted" data-id="${item.id}"></div>
          </div>
        </div>
      `;
    }

    return '';
  }).join('');
}

function getSelectedExportKulturIds() {
  return [...document.querySelectorAll('.exp-kultur-check:checked')]
    .map(check => Number(check.dataset.id))
    .filter(Boolean);
}

function getFilteredExportEinsatzorte() {
  const selectedKulturIds = getSelectedExportKulturIds();
  if (!selectedKulturIds.length) return [];

  const selected = new Set(selectedKulturIds.map(String));
  return (einsatzorteItems || []).filter(item => selected.has(String(item.kultur_id || '')));
}

function getExportOrtNameById(ortId) {
  const ort = (typeof orteItems !== 'undefined' ? orteItems : [])
    .find(item => String(item.id) === String(ortId));
  return ort?.name || ort?.bezeichnung || `Ort #${ortId}`;
}

function renderExportFieldQuickSelect(filteredItems, hasSelectedKultur) {
  const container = $('exp-einsatzorte-quick-select');
  if (!container) return;

  if (!hasSelectedKultur || !filteredItems.length) {
    container.innerHTML = '';
    return;
  }

  const ortIds = [...new Set(
    filteredItems
      .map(item => item.ort_id)
      .filter(id => id !== null && id !== undefined && id !== '')
      .map(String)
  )];

  container.innerHTML = `
    <button type="button" class="btn btn-sm btn-outline" data-export-field-select="all">Alle</button>
    <button type="button" class="btn btn-sm btn-ghost" data-export-field-select="none">Keine</button>
    ${ortIds.map(ortId => `
      <button type="button" class="btn btn-sm btn-outline" data-export-field-select="ort" data-ort-id="${escapeHtml(ortId)}">
        ${escapeHtml(getExportOrtNameById(ortId))}
      </button>
    `).join('')}
  `;
}

function applyExportFieldQuickSelect(mode, ortId = '') {
  const checks = [...document.querySelectorAll('.exp-einsatzort-check')];

  checks.forEach(check => {
    if (mode === 'all') {
      check.checked = true;
    } else if (mode === 'none') {
      check.checked = false;
    } else if (mode === 'ort') {
      check.checked = String(check.dataset.ortId || '') === String(ortId);
    }

    const wrap = $(`exp-einsatzort-${check.dataset.id}`);
    if (wrap) wrap.classList.toggle('selected', check.checked);
  });

  if (typeof syncLegacyExportUI === 'function') {
    syncLegacyExportUI();
  }
}

function renderFilteredExportEinsatzorte() {
  const selectedFieldIds = new Set(
    [...document.querySelectorAll('.exp-einsatzort-check:checked')]
      .map(check => String(check.dataset.id))
  );
  const filteredItems = getFilteredExportEinsatzorte();
  const hasSelectedKultur = getSelectedExportKulturIds().length > 0;

  renderExportFieldQuickSelect(filteredItems, hasSelectedKultur);

  renderExportSelectionList(
    'exp-einsatzorte-list',
    filteredItems,
    'einsatzort',
    hasSelectedKultur
      ? 'Keine Felder für die ausgewählte Kultur vorhanden.'
      : 'Bitte zuerst eine Kultur auswählen.'
  );

  filteredItems.forEach(item => {
    if (!selectedFieldIds.has(String(item.id))) return;

    const wrap = $(`exp-einsatzort-${item.id}`);
    const checkbox = wrap?.querySelector('.exp-einsatzort-check');
    if (checkbox) {
      checkbox.checked = true;
      wrap.classList.add('selected');
    }
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-export-field-select]');
  if (!button) return;

  event.preventDefault();
  applyExportFieldQuickSelect(button.dataset.exportFieldSelect, button.dataset.ortId || '');
});

async function toggleExpItem(type, id) {
  let wrap = null;
  if (type === 'psm')        wrap = $(`exp-psm-${id}`);
  if (type === 'einsatzort') wrap = $(`exp-einsatzort-${id}`);
  if (type === 'kultur')     wrap = $(`exp-kultur-${id}`);
  if (!wrap) return;
  const checkbox = wrap.querySelector('input[type="checkbox"]');
  if (!checkbox) return;
  wrap.classList.toggle('selected', checkbox.checked);
  if (type === 'kultur' && checkbox.checked) {
    try {
      await getBBCHOptionsForKultur(id);
    } catch (err) {
      console.error(err);
      toast('❌ BBCH-Codes konnten nicht geladen werden');
    }
  }

  if (type === 'kultur') {
    renderFilteredExportEinsatzorte();
    if (typeof syncLegacyExportUI === 'function') {
      syncLegacyExportUI();
    }
  }
}

function loadExportSelections() {
  renderExportSelectionList('exp-psm-list',       psmItems        || [], 'psm');
  renderExportSelectionList('exp-kulturen-list',   kulturenItems   || [], 'kultur');
  renderFilteredExportEinsatzorte();
}

function getExportPayload() {
  const psm_overrides = [...document.querySelectorAll('.exp-psm-check:checked')].map(check => {
    const id = Number(check.dataset.id);
    const amountInput = document.querySelector(`.exp-psm-amount[data-id="${id}"]`);
    return { id, aufwandMenge: amountInput ? amountInput.value.trim() : '' };
  });

  const einsatzort_ids = [...document.querySelectorAll('.exp-einsatzort-check:checked')].map(check =>
    Number(check.dataset.id)
  );

  const kult_overrides = [...document.querySelectorAll('.exp-kultur-check:checked')].map(check => {
    const id = Number(check.dataset.id);
    const bbchInput = document.querySelector(`.exp-kultur-bbch[data-id="${id}"]`);
    return { id, bbchCode: bbchInput ? bbchInput.value.trim() : '' };
  });

  return {
    anwendung: {
      datum:          $('exp-datum')          ? $('exp-datum').value           : '',
      uhrzeit:        $('exp-uhrzeit')        ? $('exp-uhrzeit').value         : '',
      artVerwendung:  $('exp-artVerwendung')  ? $('exp-artVerwendung').value.trim()  : '',
      anwender:       $('exp-anwender')       ? $('exp-anwender').value.trim()       : '',
      verantwortlich: $('exp-verantwortlich') ? $('exp-verantwortlich').value.trim() : ''
    },
    psm_overrides,
    einsatzort_ids,
    kult_overrides
  };
}

async function previewJSON() {
  try {
    const payload = getExportPayload();
    const data = await apiPost('/api/preview', payload);
    const pre = $('preview-json');
    if (pre) pre.textContent = JSON.stringify(data, null, 2);
    toast('✅ Vorschau aktualisiert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function ensureHistorySaved(payload) {
  const signature = getPayloadSignature(payload);
  if (lastSavedHistorySignature === signature) return;
  const preview = await apiPost('/api/preview', payload);
  const result  = await apiPost('/api/history', preview);
  if (!result.ok) throw new Error(result.error || 'History konnte nicht gespeichert werden.');
  lastSavedHistorySignature = signature;
}

// ── Build a nice filename base from the current export payload ────────────────
function buildExportBasename() {
  const datum  = $('exp-datum')  ? $('exp-datum').value  : '';
  const datePart = datum ? datum.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');

  // First selected PSM name
  const firstPsmCheck = document.querySelector('.exp-psm-check:checked');
  let psmPart = '';
  if (firstPsmCheck) {
    const id    = Number(firstPsmCheck.dataset.id);
    const wrap  = $(`exp-psm-${id}`);
    const name  = wrap ? (wrap.querySelector('.ci-name') || {}).textContent || '' : '';
    psmPart = name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_äöüÄÖÜß\-]/g, '').slice(0, 40);
  }

  return psmPart ? `PSM_Anwendung_${datePart}_${psmPart}` : `PSM_Anwendung_${datePart}`;
}

// ── "Lokal speichern" — saves both JSON and PDF on the server ─────────────────
async function exportSave() {
  try {
    const payload = getExportPayload();
    await ensureHistorySaved(payload);

    // Save JSON
    const jsonResp = await fetch('/api/export', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      body: JSON.stringify(payload)
    });
    if (!jsonResp.ok) {
      const body = await jsonResp.json().catch(() => ({}));
      throw new Error(body.error || 'JSON-Speichern fehlgeschlagen');
    }
    const jsonData = await jsonResp.json();

    // Save PDF
    const pdfResp = await fetch('/api/pdf', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      body: JSON.stringify(payload)
    });
    if (!pdfResp.ok) {
      const body = await pdfResp.json().catch(() => ({}));
      throw new Error(body.error || 'PDF-Speichern fehlgeschlagen');
    }
    const pdfData = await pdfResp.json();

    toast(`✅ Gespeichert: ${jsonData.filename || 'JSON'} & ${pdfData.filename || 'PDF'}`);
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

// ── "Browser-Download" — downloads a ZIP containing JSON + PDF ───────────────
async function exportDownloadZip() {
  try {
    const payload  = getExportPayload();
    await ensureHistorySaved(payload);
    const basename = buildExportBasename();

    // Fetch JSON blob (browser-download mode: server returns raw file)
    const jsonResp = await fetch('/api/export', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      body: JSON.stringify(payload)
    });
    if (!jsonResp.ok) {
      const body = await jsonResp.json().catch(() => ({}));
      throw new Error(body.error || 'JSON-Export fehlgeschlagen');
    }

    let jsonBlob;
    const jsonCt = jsonResp.headers.get('Content-Type') || '';
    if (jsonCt.includes('application/json')) {
      // Server saved locally and returned metadata — re-fetch as blob or stringify
      const jsonData = await jsonResp.json();
      jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json', 'X-CSRFToken': getCsrfToken() });
    } else {
      jsonBlob = await jsonResp.blob();
    }

    // Fetch PDF blob
    const pdfResp = await fetch('/api/pdf', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!pdfResp.ok) {
      const body = await pdfResp.json().catch(() => ({}));
      throw new Error(body.error || 'PDF-Export fehlgeschlagen');
    }

    let pdfBlob;
    const pdfCt = pdfResp.headers.get('Content-Type') || '';
    if (pdfCt.includes('application/json')) {
      // Local-save mode returned metadata — fetch the actual file from disk if possible
      // Fallback: show warning
      toast('⚠️ PDF konnte nicht als Download bereitgestellt werden (Server-Modus).');
      pdfBlob = null;
    } else {
      pdfBlob = await pdfResp.blob();
    }

    // Build ZIP using JSZip (loaded from CDN in base.html) or a manual approach
    if (typeof JSZip !== 'undefined') {
      const zip = new JSZip();
      zip.file(`${basename}.json`, jsonBlob);
      if (pdfBlob) zip.file(`${basename}.pdf`, pdfBlob);

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${basename}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('✅ ZIP heruntergeladen');
    } else {
      // Fallback: download files individually if JSZip not available
      const a = document.createElement('a');

      a.href = URL.createObjectURL(jsonBlob);
      a.download = `${basename}.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      if (pdfBlob) {
        await new Promise(r => setTimeout(r, 300));
        const b = document.createElement('a');
        b.href = URL.createObjectURL(pdfBlob);
        b.download = `${basename}.pdf`;
        b.click();
        URL.revokeObjectURL(b.href);
      }
      toast('✅ Dateien heruntergeladen');
    }
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function searchBBCHItems(items, query) {
  const q = String(query || '').trim().toLowerCase();

  if (!q) {
    return items.slice(0, 8);
  }

  return items.filter(item => {
    const code = String(item.code || '').toLowerCase();
    const bezeichnung = String(item.bezeichnung || '').toLowerCase();
    const beschreibung = String(item.beschreibung || '').toLowerCase();

    return (
      code.includes(q) ||
      bezeichnung.includes(q) ||
      beschreibung.includes(q)
    );
  }).slice(0, 8);
}

/**
 * Positioniert das Dropdown unter dem Input (nötig wegen modal overflow:auto).
 */
function positionBBCHDropdown(kulturId) {
  const input = document.querySelector(`.exp-kultur-bbch[data-id="${kulturId}"]`);
  const results = document.querySelector(`.exp-kultur-bbch-results[data-id="${kulturId}"]`);
  if (!input || !results) return;
  const rect = input.getBoundingClientRect();
  results.style.top   = rect.bottom + 4 + 'px';
  results.style.left  = rect.left + 'px';
  results.style.width = rect.width + 'px';
}

function renderBBCHAutocompleteResults(kulturId, matches) {
  const results = document.querySelector(`.exp-kultur-bbch-results[data-id="${kulturId}"]`);
  if (!results) return;

  if (!matches.length) {
    results.innerHTML = `<div class="autocomplete-empty">Keine passenden BBCH-Codes gefunden</div>`;
    positionBBCHDropdown(kulturId);
    results.classList.add('show');
    return;
  }

  results.innerHTML = matches.map(item => `
    <button
      type="button"
      class="autocomplete-item exp-bbch-item"
      data-action="selectExportBBCH"
      data-id="${kulturId}"
      data-code="${escapeHtml(String(item.code || ''))}"
      data-bezeichnung="${escapeHtml(item.bezeichnung || '')}"
      data-beschreibung="${escapeHtml(item.beschreibung || '')}"
    >
      <div><strong>${escapeHtml(String(item.code || ''))}</strong> – ${escapeHtml(item.bezeichnung || 'Ohne Bezeichnung')}</div>
      ${item.beschreibung ? `<div class="ci-meta">${escapeHtml(item.beschreibung)}</div>` : ''}
    </button>
  `).join('');

  positionBBCHDropdown(kulturId);
  results.classList.add('show');
}

function applyExportBBCHSelection(kulturId, item) {
  const input = document.querySelector(`.exp-kultur-bbch[data-id="${kulturId}"]`);
  const hint = document.querySelector(`.exp-kultur-bbch-hint[data-id="${kulturId}"]`);
  const results = document.querySelector(`.exp-kultur-bbch-results[data-id="${kulturId}"]`);

  if (input) {
    input.value = String(item.code || '');
    input.dataset.selectedCode = String(item.code || '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (hint) {
    const bezeichnung = String(item.bezeichnung || '').trim();
    const beschreibung = String(item.beschreibung || '').trim();

    hint.textContent = beschreibung
      ? `${bezeichnung} | ${beschreibung}`
      : bezeichnung;
  }

  if (results) {
    results.classList.remove('show');
    results.innerHTML = '';
  }
}

function initExportBBCHAutocomplete() {
  document.addEventListener('focusin', async (event) => {
    const input = event.target.closest('.exp-kultur-bbch');
    if (!input) return;

    const kulturId = Number(input.dataset.id);
    if (!kulturId) return;

    try {
      const items = await getBBCHOptionsForKultur(kulturId);
      const matches = searchBBCHItems(items, input.value);

      renderBBCHAutocompleteResults(kulturId, matches);
    } catch (err) {
      console.error(err);
      toast(`❌ BBCH-Autocomplete konnte nicht geladen werden: ${err.message || err}`);
    }
  });

  document.addEventListener('input', async (event) => {
    const input = event.target.closest('.exp-kultur-bbch');
    if (!input) return;

    const kulturId = Number(input.dataset.id);
    if (!kulturId) return;

    input.dataset.selectedCode = '';

    try {
      const items = await getBBCHOptionsForKultur(kulturId);
      const matches = searchBBCHItems(items, input.value);
      renderBBCHAutocompleteResults(kulturId, matches);

      const hint = document.querySelector(`.exp-kultur-bbch-hint[data-id="${kulturId}"]`);
      if (hint && !String(input.value || '').trim()) {
        hint.textContent = '';
      }
    } catch (err) {
      console.error(err);
    }
  });

  document.addEventListener('click', (event) => {
    const option = event.target.closest('[data-action="selectExportBBCH"]');
    if (option) {
      const kulturId = Number(option.dataset.id);

      applyExportBBCHSelection(kulturId, {
        code: option.dataset.code || '',
        bezeichnung: option.dataset.bezeichnung || '',
        beschreibung: option.dataset.beschreibung || ''
      });
      return;
    }

    document.querySelectorAll('.exp-kultur-bbch-results.show').forEach(el => {
      if (!el.contains(event.target) && !event.target.closest('.exp-bbch-autocomplete')) {
        el.classList.remove('show');
      }
    });
  });

  document.addEventListener('blur', async (event) => {
    const input = event.target.closest('.exp-kultur-bbch');
    if (!input) return;

    const kulturId = Number(input.dataset.id);
    if (!kulturId) return;

    const value = String(input.value || '').trim();

    setTimeout(() => {
      const results = document.querySelector(`.exp-kultur-bbch-results[data-id="${kulturId}"]`);
      if (results) {
        results.classList.remove('show');
      }
    }, 150);

    const hint = document.querySelector(`.exp-kultur-bbch-hint[data-id="${kulturId}"]`);
    if (!hint) return;

    if (!value) {
      hint.textContent = '';
      input.dataset.selectedCode = '';
      return;
    }

    try {
      const items = await getBBCHOptionsForKultur(kulturId);
      const exact = items.find(item => String(item.code) === value);

      if (exact) {
        input.dataset.selectedCode = String(exact.code || '');
        hint.textContent = exact.beschreibung
          ? `${exact.bezeichnung} – ${exact.beschreibung}`
          : `${exact.bezeichnung}`;
      } else {
        input.dataset.selectedCode = '';
        hint.textContent = 'Unbekannter BBCH-Code für diese Kultur';
      }
    } catch (err) {
      console.error(err);
    }
  }, true);

  document.addEventListener('keydown', async (event) => {
    const input = event.target.closest('.exp-kultur-bbch');
    if (!input) return;

    const kulturId = Number(input.dataset.id);
    const results = document.querySelector(`.exp-kultur-bbch-results[data-id="${kulturId}"]`);
    if (!results || !results.classList.contains('show')) return;

    const items = [...results.querySelectorAll('[data-action="selectExportBBCH"]')];
    if (!items.length) return;

    const activeIndex = items.findIndex(el => el.classList.contains('active'));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      items.forEach(el => el.classList.remove('active'));
      items[nextIndex].classList.add('active');
      items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      items.forEach(el => el.classList.remove('active'));
      items[nextIndex].classList.add('active');
      items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    if (event.key === 'Enter') {
      const selected = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (!selected) return;

      event.preventDefault();
      applyExportBBCHSelection(kulturId, {
        code: selected.dataset.code || '',
        bezeichnung: selected.dataset.bezeichnung || '',
        beschreibung: selected.dataset.beschreibung || ''
      });
    }

    if (event.key === 'Escape') {
      results.classList.remove('show');
    }
  });
}

// Keep legacy functions as aliases so any other code that calls them still works
async function exportJSON() { return exportSave(); }
async function exportPDF()  { return exportSave(); }
initExportBBCHAutocomplete();
