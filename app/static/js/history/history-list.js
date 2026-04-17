const HISTORY_PREFIX = 'history';

function buildHistoryUrl() {
  return buildDateFilterUrl(HISTORY_PREFIX, '/api/history');
}

function resetHistoryFilter() {
  resetDateFilter(HISTORY_PREFIX, loadHistory);
}

function quickSelectHistory(range) {
  quickSelectDateRange(range, HISTORY_PREFIX, loadHistory);
}

function renderHistoryListItem(item) {
  return `
    <div class="item">
      <div class="item-info">
        <div class="name">
          ${escapeHtml(item.datum || 'Ohne Datum')}
          ${item.uhrzeit ? '· ' + escapeHtml(item.uhrzeit) : ''}
        </div>
        <div class="meta">${escapeHtml(item.artVerwendung || '—')}</div>
        <div class="meta"><strong>Einsatzorte:</strong> ${escapeHtml(item.einsatzorte || '—')}</div>
        <div class="meta"><strong>PSM:</strong> ${escapeHtml(item.psm_namen || '—')}</div>
        <div class="meta"><strong>Kulturen:</strong> ${escapeHtml(item.kulturen || '—')}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost"   data-action="showHistoryDetail"  data-id="${item.id}">Details</button>
        <button class="btn btn-sm btn-danger"  data-action="deleteHistoryEntry" data-id="${item.id}">Löschen</button>
      </div>
    </div>
  `;
}

async function loadHistory() {
  try {
    const items = await apiGet(buildHistoryUrl());
    const list  = $('history-list');
    const count = $('history-count');

    if (count) count.textContent = items.length;
    if (!list) return;

    list.innerHTML = items.length
      ? items.map(renderHistoryListItem).join('')
      : `<div class="empty">Noch keine Applikationen gespeichert.</div>`;

  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function renderHistoryDetailHTML(item) {
  const data       = item.json_data || {};
  const anwendung  = data.anwendung || {};
  const betrieb    = data.betrieb   || {};
  const psm        = data.pflanzenschutzmittel || [];
  const einsatzorte = data.einsatzorte || [];
  const kulturen   = data.kulturen  || [];

  return `
    <div class="history-section">
      <h4>Anwendung</h4>
      <div class="history-grid">
        ${historyField('Datum',              anwendung.datum)}
        ${historyField('Uhrzeit',            anwendung.uhrzeit)}
        ${historyField('Art der Verwendung', anwendung.artVerwendung)}
        ${historyField('Verantwortlich',     anwendung.verantwortlich)}
        ${historyField('Anwender',           anwendung.anwender)}
        ${historyField('Gespeichert am',     formatDateTime(item.created_at))}
      </div>
    </div>

    <div class="history-section">
      <h4>Betrieb</h4>
      <div class="history-grid">
        ${historyField('Firma',          betrieb.firma)}
        ${historyField('Nachname',       betrieb.name)}
        ${historyField('Vorname',        betrieb.vorname)}
        ${historyField('Straße / Hausnr.', betrieb.strHnr)}
        ${historyField('PLZ',            betrieb.plz)}
        ${historyField('Ort',            betrieb.ort)}
        ${historyField('Bundesland',     betrieb.bundesland)}
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
}

async function showHistoryDetail(id) {
  try {
    const item      = await apiGet(`/api/history/${id}`);
    const wrap      = $('history-detail-wrap');
    const container = $('history-detail');

    if (!wrap || !container) return;

    container.innerHTML = renderHistoryDetailHTML(item);

    wrap.classList.remove('hidden');
    wrap.classList.add('visible');
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
    if (detailWrap) {
      detailWrap.classList.remove('visible');
      detailWrap.classList.add('hidden');
    }

    await loadHistory();

  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}
