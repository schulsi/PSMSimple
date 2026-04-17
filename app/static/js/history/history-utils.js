function historyChartPalette(count) {
  const palette = [
    '#2d6a4f', '#40916c', '#52b788', '#74c69d',
    '#95d5b2', '#1b4332', '#3a5a40', '#588157'
  ];
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleString('de-DE');
}

function formatDateInputValue(date) {
  return date.toISOString().slice(0, 10);
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
    return `<div class="empty-text empty">Keine Kulturen hinterlegt.</div>`;
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
    return `<div class="empty-text empty">Keine Pflanzenschutzmittel vorhanden.</div>`;
  }
  return `
    <div class="history-list-block">
      ${items.map(psm => {
        const menge   = psm.aufwandMenge   || '';
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
    return `<div class="empty-text empty">Keine Einsatzorte vorhanden.</div>`;
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


/**
 * Setzt Standardwerte (heute & vor einem Jahr) für ein Datumsfilter-Paar.
 * @param {string} prefix  z. B. 'history', 'psm-history', 'fields-history'
 */
function setDefaultDates(prefix) {
  const from = $(`${prefix}-date-from`);
  const to   = $(`${prefix}-date-to`);
  if (!from || !to) return;

  const today    = new Date();
  const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  if (!from.value) from.value = formatDateInputValue(lastYear);
  if (!to.value)   to.value   = formatDateInputValue(today);
}


function setDateRange(prefix, fromDate, toDate) {
  const from = $(`${prefix}-date-from`);
  const to   = $(`${prefix}-date-to`);
  if (!from || !to) return;
  from.value = formatDateInputValue(fromDate);
  to.value   = formatDateInputValue(toDate);
}

/**
 * Baut die API-URL mit optionalen date_from / date_to Query-Parametern.
 * @param {string} prefix   Präfix für die DOM-IDs
 * @param {string} apiPath  Basis-Pfad, z. B. '/api/history'
 */
function buildDateFilterUrl(prefix, apiPath) {
  setDefaultDates(prefix);
  const dateFrom = $(`${prefix}-date-from`)?.value || '';
  const dateTo   = $(`${prefix}-date-to`)?.value   || '';
  const params   = new URLSearchParams();

  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo)   params.set('date_to',   dateTo);

  return `${apiPath}${params.toString() ? '?' + params.toString() : ''}`;
}

function resetDateFilter(prefix, loadFn) {
  const today    = new Date();
  const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  setDateRange(prefix, lastYear, today);
  loadFn();
}

/**
 * Schnellauswahl eines Zeitraums und anschließendes Neu-Laden.
 * @param {string}   range   'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'
 * @param {string}   prefix
 * @param {Function} loadFn
 */
function quickSelectDateRange(range, prefix, loadFn) {
  const today = new Date();
  let start, end;

  switch (range) {
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end   = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1);
      end   = new Date(today.getFullYear(), 11, 31);
      break;
    case 'lastYear':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end   = new Date(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return;
  }

  setDateRange(prefix, start, end);
  loadFn();
}
