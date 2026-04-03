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

function formatDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function setDefaultHistoryDates() {
  const from = $('history-date-from');
  const to = $('history-date-to');
  if (!from || !to) return;

  const today = new Date();
  const inOneYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  if (!from.value) from.value = formatDateInputValue(today);
  if (!to.value) to.value = formatDateInputValue(inOneYear);
}

function setHistoryDateRange(fromDate, toDate) {
  const from = $('history-date-from');
  const to = $('history-date-to');
  if (!from || !to) return;
  from.value = formatDateInputValue(fromDate);
  to.value = formatDateInputValue(toDate);
}

function quickSelectHistory(range) {
  const today = new Date();
  let start;
  let end;

  switch (range) {
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case 'lastYear':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return;
  }

  setHistoryDateRange(start, end);
  loadHistory();
}

function buildHistoryUrl() {
  setDefaultHistoryDates();
  const dateFrom = $('history-date-from')?.value || '';
  const dateTo = $('history-date-to')?.value || '';
  const params = new URLSearchParams();

  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `/api/history${suffix}`;
}

function resetHistoryFilter() {
  const today = new Date();
  const inOneYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  setHistoryDateRange(today, inOneYear);
  loadHistory();
}

document.addEventListener('DOMContentLoaded', () => {
  setDefaultHistoryDates();
  loadHistory();
});

async function loadHistory() {
  try {

    const items = await apiGet(buildHistoryUrl());
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

// PSM Usage History functions
function formatDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function setDefaultPSMHistoryDates() {
  const from = $('psm-history-date-from');
  const to = $('psm-history-date-to');
  if (!from || !to) return;

  const today = new Date();
  const inOneYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  if (!from.value) from.value = formatDateInputValue(today);
  if (!to.value) to.value = formatDateInputValue(inOneYear);
}

function setPSMHistoryDateRange(fromDate, toDate) {
  const from = $('psm-history-date-from');
  const to = $('psm-history-date-to');
  if (!from || !to) return;
  from.value = formatDateInputValue(fromDate);
  to.value = formatDateInputValue(toDate);
}

function buildPSMHistoryUrl() {
  setDefaultPSMHistoryDates();
  const dateFrom = $('psm-history-date-from')?.value || '';
  const dateTo = $('psm-history-date-to')?.value || '';
  const params = new URLSearchParams();

  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `/api/history/psm-usage${suffix}`;
}

function resetPSMHistoryFilter() {
  const today = new Date();
  const inOneYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  setPSMHistoryDateRange(today, inOneYear);
  loadPSMUsage();
}

function quickSelectPSMHistory(range) {
  const today = new Date();
  let start;
  let end;

  switch (range) {
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case 'lastYear':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return;
  }

  setPSMHistoryDateRange(start, end);
  loadPSMUsage();
}

async function loadPSMUsage() {
  try {
    const items = await apiGet(buildPSMHistoryUrl());
    const list = $('psm-usage-list');
    const chartCanvas = $('psm-usage-chart');

    if (!list || !chartCanvas) return;

    if (!items.length) {
      list.innerHTML = `<div class="empty">Keine PSM-Verwendungen im ausgewählten Zeitraum.</div>`;
      // Clear chart
      const ctx = chartCanvas.getContext('2d');
      if (window.psmChart) {
        window.psmChart.destroy();
      }
      return;
    }

    // Render chart
    const ctx = chartCanvas.getContext('2d');
    if (window.psmChart) {
      window.psmChart.destroy();
    }

    const labels = items.map(item => item.psm_name);
    const data = items.map(item => item.usage_count);

    window.psmChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF',
            '#4BC0C0',
            '#FF6384'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.parsed} Verwendungen`;
              }
            }
          }
        }
      }
    });

    list.innerHTML = `
      <table class="psm-usage-table">
        <thead>
          <tr>
            <th>Pflanzenschutzmittel</th>
            <th>Verwendungen</th>
            <th>Zuletzt verwendet</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.psm_name)}</td>
              <td>${item.usage_count}</td>
              <td>${item.last_used || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function showHistorySubTab(tabName) {
  // Hide all sub-tabs
  document.querySelectorAll('.history-sub-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));

  // Show selected sub-tab
  document.getElementById(`history-sub-${tabName}`).classList.add('active');
  event.target.classList.add('active');

  // Load data if PSM usage
  if (tabName === 'psm-usage') {
    loadPSMUsage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setDefaultHistoryDates();
  setDefaultPSMHistoryDates();
  loadHistory();
});