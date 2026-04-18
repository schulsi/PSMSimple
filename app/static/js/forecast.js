let _forecastInitialized = false;
let _forecastEinsatzorteLoaded = false;

function initForecastTab() {
  if (!_forecastInitialized) {
    _forecastInitialized = true;
    bindForecastUI();
  }

  if (!_forecastEinsatzorteLoaded) {
    loadForecastEinsatzorte();
  }
}

function bindForecastUI() {
  // Falls du nur über data-action arbeitest, kann das leer bleiben.
  // Falls nötig, hier zusätzliche Listener registrieren.
}

async function loadForecastEinsatzorte() {
  const select = document.getElementById('forecast-einsatzort');
  if (!select) return;

  try {
    const items = await apiGet('/api/einsatzorte');
    const list = Array.isArray(items) ? items : [];

    select.innerHTML = '';

    if (!list.length) {
      select.innerHTML = '<option value="">Keine Einsatzorte vorhanden</option>';
      _forecastEinsatzorteLoaded = true;
      return;
    }

    for (const eo of list) {
      const opt = document.createElement('option');
      opt.value = eo.id;
      opt.textContent = eo.name || `Einsatzort ${eo.id}`;
      select.appendChild(opt);
    }

    _forecastEinsatzorteLoaded = true;
  } catch (err) {
    console.error('loadForecastEinsatzorte failed', err);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

function getForecastRangeHours() {
  const value = document.getElementById('forecast-range')?.value || '72';

  if (value === 'today') {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const diffHours = Math.ceil((end - now) / (1000 * 60 * 60));
    return Math.max(1, diffHours);
  }

  return parseInt(value, 10) || 72;
}

function getForecastPayload() {
  return {
    hours: getForecastRangeHours(),
    thresholds: {
      max_wind_ms: parseFloat(document.getElementById('forecast-max-wind')?.value || '3.5'),
      max_precip_mm: parseFloat(document.getElementById('forecast-max-precip')?.value || '0.0'),
      min_temp_c: parseFloat(document.getElementById('forecast-min-temp')?.value || '8'),
      max_temp_c: parseFloat(document.getElementById('forecast-max-temp')?.value || '25'),
      min_humidity_pct: parseFloat(document.getElementById('forecast-min-humidity')?.value || '50'),
      min_window_hours: parseInt(document.getElementById('forecast-min-window-hours')?.value || '2', 10),
      dry_hours_after: parseInt(document.getElementById('forecast-dry-hours-after')?.value || '3', 10),
      min_hour: parseInt(document.getElementById('forecast-min-hour')?.value || '6', 10),
      max_hour: parseInt(document.getElementById('forecast-max-hour')?.value || '23', 10),
    
    }
  };
}

async function calculateForecastWindow() {
  const select = document.getElementById('forecast-einsatzort');
  const einsatzortId = select?.value;

  if (!einsatzortId) {
    renderForecastError('Bitte zuerst einen Einsatzort auswählen.');
    return;
  }

  renderForecastLoading(true);
  renderForecastError('');
  clearForecastResult();

  try {
    const payload = getForecastPayload();
    const result = await apiPost(`/api/einsatzorte/${einsatzortId}/spray-window`, payload);

    renderForecastLoading(false);
    console.log(result)

    if (!result || result.error) {
      renderForecastError(result?.message || 'Vorhersage konnte nicht berechnet werden.');
      return;
    }

    renderForecastResult(result);
  } catch (err) {
    console.error('calculateForecastWindow failed', err);
    renderForecastLoading(false);
    renderForecastError(err?.message || 'Fehler beim Laden der Vorhersage.');
  }
}

function renderForecastLoading(show) {
  const el = document.getElementById('forecast-loading');
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

function renderForecastError(message) {
  const el = document.getElementById('forecast-error');
  if (!el) return;

  if (!message) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }

  el.textContent = message;
  el.classList.remove('hidden');
}

function clearForecastResult() {
  const best = document.getElementById('forecast-best-window');
  const altWrap = document.getElementById('forecast-alt-wrap');
  const altList = document.getElementById('forecast-alt-list');

  if (best) {
    best.innerHTML = '';
    best.className = 'forecast-best-window hidden';
  }

  if (altWrap) altWrap.classList.add('hidden');
  if (altList) altList.innerHTML = '';
}

function renderForecastResult(data) {
  const best = data.best_window;
  const windows = Array.isArray(data.windows) ? data.windows : [];

  const bestEl = document.getElementById('forecast-best-window');
  const altWrap = document.getElementById('forecast-alt-wrap');
  const altList = document.getElementById('forecast-alt-list');

  if (!bestEl || !altWrap || !altList) return;

  if (!best) {
    bestEl.className = 'forecast-best-window';
    bestEl.innerHTML = `
      <div class="forecast-best-title">Kein passendes Zeitfenster gefunden</div>
      <div>Im gewählten Zeitraum wurde mit den aktuellen Thresholds kein geeignetes Spritzfenster erkannt.</div>
    `;
    bestEl.classList.remove('hidden');
    altWrap.classList.add('hidden');
    return;
  }

  bestEl.className = 'forecast-best-window is-good';
  bestEl.innerHTML = `
    <div class="forecast-best-title">Empfohlenes Zeitfenster</div>
    <div class="forecast-best-time">${formatForecastWindow(best.start, best.end)}</div>
    <div>Das aktuell beste erkannte Spritzfenster liegt in diesem Zeitraum.</div>

    <div class="forecast-best-meta">
      <div class="forecast-meta-box">
        <div class="forecast-meta-label">Dauer</div>
        <div class="forecast-meta-value">${best.duration_hours} h</div>
      </div>
      <div class="forecast-meta-box">
        <div class="forecast-meta-label">Score</div>
        <div class="forecast-meta-value">${best.avg_score}</div>
      </div>
      <div class="forecast-meta-box">
        <div class="forecast-meta-label">Beginn</div>
        <div class="forecast-meta-value">${formatDateTime(best.start)}</div>
      </div>
    </div>
  `;
  bestEl.classList.remove('hidden');

  const alternatives = windows.slice(1, 4);
  if (!alternatives.length) {
    altWrap.classList.add('hidden');
    altList.innerHTML = '';
    return;
  }

  altList.innerHTML = alternatives.map((w, idx) => `
    <div class="forecast-window-item">
      <div class="forecast-window-title">Alternative ${idx + 1}</div>
      <div>${formatForecastWindow(w.start, w.end)}</div>
      <div>Dauer: <strong>${w.duration_hours} h</strong> · Score: <strong>${w.avg_score}</strong></div>
    </div>
  `).join('');

  altWrap.classList.remove('hidden');
}

function formatForecastWindow(start, end) {
  return `${formatDateTime(start)} – ${formatDateTime(end)}`;
}

function formatDateTime(value) {
  if (!value) return '-';

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;

  return dt.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}