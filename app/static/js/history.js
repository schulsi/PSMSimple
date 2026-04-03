function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleString('de-DE');
}

function historyField(label, value) {
  return `
    <div class="history-field">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

function renderKulturenHistory(items) {
  if (!items || !items.length) {
    return `<div class="empty" style="padding:1rem">Keine Kulturen hinterlegt.</div>`;
  }

  return `
    <div class="history-list-block">
      ${items.map(k => `
        <div class="history-subitem">
          <div class="history-subitem-title">${escapeHtml(k.name || 'Unbenannte Kultur')}</div>
          <div class="history-subitem-meta"><strong>BBCH-Stadium:</strong> ${escapeHtml(k.bbchCode || '—')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPSMHistory(items) {
  if (!items || !items.length) {
    return `<div class="empty" style="padding:1rem">Keine Pflanzenschutzmittel vorhanden.</div>`;
  }

  return `
    <div class="history-list-block">
      ${items.map(psm => {
        const menge = psm.aufwandMenge || '';
        const einheit = psm.aufwandEinheit || '';
        const aufwand = menge ? `${menge} ${einheit}`.trim() : '—';

        return `
          <div class="history-subitem">
            <div class="history-subitem-title">${escapeHtml(psm.name || 'Unbenanntes Mittel')}</div>
            <div class="history-subitem-meta"><strong>Verwendete Menge:</strong> ${escapeHtml(aufwand)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderEinsatzorteHistory(items) {
  if (!items || !items.length) {
    return `<div class="empty" style="padding:1rem">Keine Einsatzorte vorhanden.</div>`;
  }

  return `
    <div class="history-list-block">
      ${items.map(ort => `
        <div class="history-subitem">
          <div class="history-subitem-title">${escapeHtml(ort.name || 'Unbenannter Einsatzort')}</div>
          <div class="history-subitem-meta">Bereich: ${escapeHtml(ort.anwendungsbereich || '—')}</div>
          <div class="history-subitem-meta">Fläche: ${escapeHtml(ort.flaecheVolumen || '—')} ${escapeHtml(ort.einheit || '')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadHistory() {
  try {
    const items = await apiGet('/api/history');
    const list = $('history-list');
    const count = $('history-count');

    if (count) count.textContent = items.length;

    if (!list) return;

    if (!items.length) {
      list.innerHTML = `<div class="empty">Noch keine Applikationen gespeichert.</div>`;
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="item">
        <div class="item-info">
          <div class="name">${escapeHtml(item.datum || 'Ohne Datum')} ${item.uhrzeit ? '· ' + escapeHtml(item.uhrzeit) : ''}</div>
          <div class="meta">${escapeHtml(item.artVerwendung || '—')}</div>
          <div class="meta">📍 ${escapeHtml(item.einsatzorte || '—')}</div>
          <div class="meta">🧪 ${escapeHtml(item.psm_namen || '—')}</div>
          <div class="meta">🌾 ${escapeHtml(item.kulturen || '—')}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-ghost" onclick="showHistoryDetail(${item.id})">Ansehen</button>
          <button class="btn btn-sm btn-danger" onclick="deleteHistoryEntry(${item.id})">Löschen</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function showHistoryDetail(id) {
  try {
    const item = await apiGet(`/api/history/${id}`);
    const wrap = $('history-detail-wrap');
    const container = $('history-detail');

    if (!wrap || !container) return;

    const data = item.json_data || {};
    const anwendung = data.anwendung || {};
    const betrieb = data.betrieb || {};
    const psm = data.pflanzenschutzmittel || [];
    const einsatzorte = data.einsatzorte || [];
    const kulturen = data.kulturen || [];

    container.innerHTML = `
      <div class="history-section">
        <h4>Allgemein</h4>
        <div class="history-grid">
          ${historyField('Datum', anwendung.datum)}
          ${historyField('Uhrzeit', anwendung.uhrzeit)}
          ${historyField('Art der Verwendung', anwendung.artVerwendung)}
          ${historyField('Verantwortlich', anwendung.verantwortlich)}
          ${historyField('Anwender', anwendung.anwender)}
          ${historyField('Gespeichert am', formatDateTime(item.created_at))}
        </div>
      </div>

      <div class="history-section">
        <h4>Betrieb</h4>
        <div class="history-grid">
          ${historyField('Firma', betrieb.firma)}
          ${historyField('Nachname', betrieb.name)}
          ${historyField('Vorname', betrieb.vorname)}
          ${historyField('Straße / Hausnr.', betrieb.strHnr)}
          ${historyField('PLZ', betrieb.plz)}
          ${historyField('Ort', betrieb.ort)}
          ${historyField('Bundesland', betrieb.bundesland)}
        </div>
      </div>

      <div class="history-section">
        <h4>Kulturen & BBCH</h4>
        ${renderKulturenHistory(kulturen)}
      </div>

      <div class="history-section">
        <h4>Einsatzorte</h4>
        ${renderEinsatzorteHistory(einsatzorte)}
      </div>

      <div class="history-section">
        <h4>Pflanzenschutzmittel</h4>
        ${renderPSMHistory(psm)}
      </div>
    `;

    wrap.style.display = 'block';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function deleteHistoryEntry(id) {
  if (!confirm('Diesen History-Eintrag wirklich löschen?')) return;

  try {
    await apiDelete(`/api/history/${id}`);
    toast('✅ History-Eintrag gelöscht');

    const detailWrap = $('history-detail-wrap');
    if (detailWrap) detailWrap.style.display = 'none';

    await loadHistory();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}