let lastSavedHistorySignature = null;

function getPayloadSignature(payload) {
  return JSON.stringify(payload);
}

function renderExportSelectionList(containerId, items, type) {
  const container = $(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="empty">Keine Einträge vorhanden.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    if (type === 'psm') {
      return `
        <div class="exp-item" id="exp-psm-${item.id}">
          <label class="exp-item-header">
            <input type="checkbox" class="exp-psm-check" data-id="${item.id}" onchange="toggleExpItem('psm', ${item.id})">
            <div>
              <div class="ci-name">${escapeHtml(item.name || '—')}</div>
              <div class="ci-meta">${escapeHtml(item.zulassungsnr || '—')} · ${escapeHtml(item.aufwandEinheit || '—')}</div>
            </div>
          </label>
          <div class="exp-item-extra">
            <label>Aufwandsmenge</label>
            <input type="text" class="exp-psm-amount" data-id="${item.id}" placeholder="z. B. 1,5">
          </div>
        </div>
      `;
    }

    if (type === 'einsatzort') {
      return `
        <div class="exp-item" id="exp-einsatzort-${item.id}">
          <label class="exp-item-header">
            <input type="checkbox" class="exp-einsatzort-check" data-id="${item.id}" onchange="toggleExpItem('einsatzort', ${item.id})">
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
            <input type="checkbox" class="exp-kultur-check" data-id="${item.id}" onchange="toggleExpItem('kultur', ${item.id})">
            <div>
              <div class="ci-name">${escapeHtml(item.name || '—')}</div>
              <div class="ci-meta">${escapeHtml(item.eppoCode || '—')}</div>
            </div>
          </label>
          <div class="exp-item-extra">
            <label>BBCH-Code</label>
            <input type="text" class="exp-kultur-bbch" data-id="${item.id}" placeholder="z. B. 39">
          </div>
        </div>
      `;
    }

    return '';
  }).join('');
}

function toggleExpItem(type, id) {
  let wrap = null;
  if (type === 'psm')        wrap = $(`exp-psm-${id}`);
  if (type === 'einsatzort') wrap = $(`exp-einsatzort-${id}`);
  if (type === 'kultur')     wrap = $(`exp-kultur-${id}`);
  if (!wrap) return;
  const checkbox = wrap.querySelector('input[type="checkbox"]');
  if (!checkbox) return;
  wrap.classList.toggle('selected', checkbox.checked);
}

function loadExportSelections() {
  renderExportSelectionList('exp-psm-list',       psmItems        || [], 'psm');
  renderExportSelectionList('exp-einsatzorte-list', einsatzorteItems || [], 'einsatzort');
  renderExportSelectionList('exp-kulturen-list',   kulturenItems   || [], 'kultur');
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
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

// Keep legacy functions as aliases so any other code that calls them still works
async function exportJSON() { return exportSave(); }
async function exportPDF()  { return exportSave(); }
