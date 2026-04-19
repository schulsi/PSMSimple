// ---------------------------------------------------------------------------
// Inventory – Lagerverwaltung
// ---------------------------------------------------------------------------

const STATUS_LABEL = {
  ok:       { text: 'OK',       cls: 'badge-ok'       },
  warning:  { text: 'Warnung',  cls: 'badge-warning'  },
  critical: { text: 'Kritisch', cls: 'badge-critical' },
  negative: { text: 'Negativ',  cls: 'badge-negative' },
};

const MOVEMENT_TYPE_LABEL = {
  purchase:         'Einkauf',
  application:      'Ausbringung',
  correction_plus:  'Korrektur +',
  correction_minus: 'Korrektur −',
  disposal:         'Entsorgung',
};

// ---------------------------------------------------------------------------
// Übersicht laden & rendern
// ---------------------------------------------------------------------------

async function loadInventory() {
  try {
    const data = await apiGet('/api/inventory');
    renderInventoryOverview(data);
  } catch (err) {
    console.error(err);
    toast('❌ Lagerbestand konnte nicht geladen werden');
  }
}

function renderInventoryOverview(items) {
  const list = $('inventory-list');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="empty">Noch keine Pflanzenschutzmittel angelegt.</div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const s = STATUS_LABEL[item.status] || STATUS_LABEL.ok;
    const warnRow = item.status !== 'ok' ? `
      <div class="inventory-thresholds">
        ${item.min_lager   ? `<span class="threshold min">Min: ${item.min_lager} ${item.einheit}</span>` : ''}
        ${item.warnung_lager ? `<span class="threshold warn">Warnung: ${item.warnung_lager} ${item.einheit}</span>` : ''}
      </div>` : '';

    return `
    <div class="item inventory-item" data-status="${item.status}">
      <div class="item-info">
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="inventory-bestand">
          <span class="bestand-zahl">${item.bestand}</span>
          <span class="bestand-einheit">${escapeHtml(item.einheit || '—')}</span>
        </div>
        ${warnRow}
      </div>
      <div class="item-actions">
        <span class="badge-status ${s.cls}">${s.text}</span>
        <button class="btn btn-sm btn-ghost" data-action="openInventoryMovementModal" data-id="${item.psm_id}" data-name="${escapeHtml(item.name)}" data-einheit="${escapeHtml(item.einheit || '')}">+ Buchung</button>
      </div>
    </div>`;
  }).join('');

  // Warnungs-Badge in der Nav aktualisieren
  const warnings = items.filter(i => i.status !== 'ok').length;
  const badge = $('inventory-warning-count');
  if (badge) {
    badge.textContent = warnings > 0 ? String(warnings) : '';
    badge.classList.toggle('hidden', warnings === 0);
  }
}

// ---------------------------------------------------------------------------
// Bewegungshistorie
// ---------------------------------------------------------------------------

async function loadInventoryMovements() {
  try {
    const limit = parseInt($('inventory-movements-limit')?.value || '200', 10);
    const data = await apiGet(`/api/inventory/movements?limit=${limit}`);
    renderInventoryMovements(data);
  } catch (err) {
    console.error(err);
    toast('❌ Bewegungshistorie konnte nicht geladen werden');
  }
}

function renderInventoryMovements(rows) {
  const list = $('inventory-movements-list');
  if (!list) return;

  if (!rows.length) {
    list.innerHTML = `<div class="empty">Keine Lagerbewegungen vorhanden.</div>`;
    return;
  }

  list.innerHTML = `
    <table class="table movements-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Mittel</th>
          <th>Typ</th>
          <th>Menge</th>
          <th>Notiz</th>
          <th>Quelle</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${escapeHtml(row.datum || '—')}</td>
            <td>${escapeHtml(row.psm_name || '—')}</td>
            <td><span class="movement-type movement-type-${row.typ}">${escapeHtml(MOVEMENT_TYPE_LABEL[row.typ] || row.typ)}</span></td>
            <td class="text-right">${row.menge} ${escapeHtml(row.einheit || '')}</td>
            <td class="text-muted">${escapeHtml(row.notiz || '-')}</td>
            <td class="text-muted">${escapeHtml(row.quelle || '-')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Buchungs-Modal
// ---------------------------------------------------------------------------

function openInventoryMovementModal(psmId, psmName, einheit) {
  const titleEl = $('modal-inventory-title');
  if (titleEl) titleEl.textContent = `Buchung: ${psmName}`;

  const psmIdInput = $('inv-psm-id');
  if (psmIdInput) psmIdInput.value = psmId;

  const einheitLabel = $('inv-einheit-label');
  if (einheitLabel) einheitLabel.textContent = einheit || '';

  // Datum vorbelegen mit heute
  const datumInput = $('inv-datum');
  if (datumInput && !datumInput.value) {
    datumInput.value = new Date().toISOString().slice(0, 10);
  }

  openModal('modal-inventory');
}

async function saveInventoryMovement() {
  const psm_id = parseInt($('inv-psm-id')?.value, 10);
  const typ     = $('inv-typ')?.value?.trim();
  const menge   = parseFloat($('inv-menge')?.value);
  const datum   = $('inv-datum')?.value?.trim();
  const notiz   = $('inv-notiz')?.value?.trim() || null;

  if (!psm_id || !typ || isNaN(menge) || menge < 0 || !datum) {
    toast('❌ Bitte alle Pflichtfelder ausfüllen');
    return;
  }

  try {
    await apiPost('/api/inventory/movements', { psm_id, typ, menge, datum, notiz });
    toast('✅ Buchung gespeichert');
    closeModal('modal-inventory');
    resetInventoryMovementForm();
    await loadInventory();
    // Bewegungshistorie neu laden falls sichtbar
    if ($('inventory-movements-list')) {
      await loadInventoryMovements();
    }
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function resetInventoryMovementForm() {
  ['inv-psm-id', 'inv-typ', 'inv-menge', 'inv-datum', 'inv-notiz'].forEach(id => {
    const el = $(id);
    if (el) el.value = id === 'inv-typ' ? 'purchase' : '';
  });
}

function showInventorySubTab(subtab, btn = null) {
  document.querySelectorAll('#tab-inventory .sub-tab-btn').forEach(el => {
    el.classList.remove('active');
  });

  document.querySelectorAll('#tab-inventory .history-sub-tab').forEach(el => {
    el.classList.remove('active');
  });

  if (btn) {
    btn.classList.add('active');
  }

  const target = document.getElementById(`inventory-sub-${subtab}`);
  if (target) {
    target.classList.add('active');
  }

  if (subtab === 'movements') {
    loadInventoryMovements();
  } else {
    loadInventory();
  }
}