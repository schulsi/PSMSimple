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
            <input type="number" class="exp-psm-amount" data-id="${item.id}" placeholder="z. B. 1,5">
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
            <input type="number" class="exp-kultur-bbch" data-id="${item.id}" placeholder="z. B. 39">
          </div>
        </div>
      `;
    }

    return '';
  }).join('');
}

function toggleExpItem(type, id) {
  let wrap = null;

  if (type === 'psm') wrap = $(`exp-psm-${id}`);
  if (type === 'einsatzort') wrap = $(`exp-einsatzort-${id}`);
  if (type === 'kultur') wrap = $(`exp-kultur-${id}`);

  if (!wrap) return;

  const checkbox = wrap.querySelector('input[type="checkbox"]');
  if (!checkbox) return;

  wrap.classList.toggle('selected', checkbox.checked);
}

function loadExportSelections() {
  renderExportSelectionList('exp-psm-list', psmItems || [], 'psm');
  renderExportSelectionList('exp-einsatzorte-list', einsatzorteItems || [], 'einsatzort');
  renderExportSelectionList('exp-kulturen-list', kulturenItems || [], 'kultur');
}

function getExportPayload() {
  const psm_overrides = [...document.querySelectorAll('.exp-psm-check:checked')].map(check => {
    const id = Number(check.dataset.id);
    const amountInput = document.querySelector(`.exp-psm-amount[data-id="${id}"]`);
    return {
      id,
      aufwandMenge: amountInput ? amountInput.value.trim() : ''
    };
  });

  const einsatzort_ids = [...document.querySelectorAll('.exp-einsatzort-check:checked')].map(check =>
    Number(check.dataset.id)
  );

  const kult_overrides = [...document.querySelectorAll('.exp-kultur-check:checked')].map(check => {
    const id = Number(check.dataset.id);
    const bbchInput = document.querySelector(`.exp-kultur-bbch[data-id="${id}"]`);
    return {
      id,
      bbchCode: bbchInput ? bbchInput.value.trim() : ''
    };
  });

  return {
    anwendung: {
      datum: $('exp-datum') ? $('exp-datum').value : '',
      uhrzeit: $('exp-uhrzeit') ? $('exp-uhrzeit').value : '',
      artVerwendung: $('exp-artVerwendung') ? $('exp-artVerwendung').value.trim() : '',
      anwender: $('exp-anwender') ? $('exp-anwender').value.trim() : '',
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
    if (pre) {
      pre.textContent = JSON.stringify(data, null, 2);
    }

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
  const result = await apiPost('/api/history', preview);

  if (!result.ok) {
    throw new Error(result.error || 'History konnte nicht gespeichert werden.');
  }

  lastSavedHistorySignature = signature;
}

async function exportJSON() {
  try {
    const payload = getExportPayload();
    await ensureHistorySaved(payload);

    const resp = await fetch('/api/export', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const ct = resp.headers.get('Content-Type') || '';

    if (!resp.ok) {
      let message = 'JSON-Export fehlgeschlagen';
      if (ct.includes('application/json')) {
        try {
          const body = await resp.json();
          if (body.error) message = body.error;
        } catch (_) {}
      }
      throw new Error(message);
    }

    if (ct.includes('application/json')) {
      const data = await resp.json();
      toast(`✅ JSON gespeichert: ${data.filename}`);
      return;
    }

    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pflanzenschutz_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast('✅ JSON exportiert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function exportPDF() {
  try {
    const payload = getExportPayload();
    await ensureHistorySaved(payload);

    const resp = await fetch('/api/pdf', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const ct = resp.headers.get('Content-Type') || '';

    if (!resp.ok) {
      let message = 'PDF-Export fehlgeschlagen';
      if (ct.includes('application/json')) {
        try {
          const body = await resp.json();
          if (body.error) message = body.error;
        } catch (_) {}
      }
      throw new Error(message);
    }

    if (ct.includes('application/json')) {
      const data = await resp.json();
      toast(`✅ PDF gespeichert: ${data.filename}`);
      return;
    }

    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);

    const cd = resp.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : 'pflanzenschutz.pdf';
    a.click();

    toast('✅ PDF exportiert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}