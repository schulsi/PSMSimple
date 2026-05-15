let _forecastInitialized = false;
let _forecastOrteLoaded = false;
let _forecastOrteItems = [];

function initForecastTab() {
  if (!_forecastInitialized) {
    _forecastInitialized = true;
    bindForecastUI();
  }

  if (!_forecastOrteLoaded) {
    loadForecastOrte();
  }
}

function bindForecastUI() {
  // optional zusätzliche Listener
}

async function loadForecastOrte() {
  const container = document.getElementById('forecast-orte');
  if (!container) return;

  try {
    const items = await apiGet('/api/orte');
    const list = Array.isArray(items) ? items : [];
    _forecastOrteItems = list;

    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML = `<div class="empty">Keine Orte vorhanden</div>`;
      _forecastOrteLoaded = true;
      return;
    }

    container.innerHTML = list.map(ort => {
      const id = ort.id;
      const name = escapeHtml(ort.name || ort.bezeichnung || `Ort ${id}`);

      return `
        <label class="forecast-checkbox-item">
          <input
            type="checkbox"
            class="forecast-ort-checkbox"
            value="${id}"
          >
          <span>${name}</span>
        </label>
      `;
    }).join('');

    _forecastOrteLoaded = true;
  } catch (err) {
    console.error('loadForecastOrte failed', err);
    container.innerHTML = `<div class="empty">Fehler beim Laden</div>`;
  }
}

function getSelectedForecastOrtIds() {
  return Array.from(
    document.querySelectorAll('#forecast-orte .forecast-ort-checkbox:checked')
  )
    .map(cb => cb.value)
    .filter(Boolean);
}

function forecastSelectAllOrte() {
  document.querySelectorAll('#forecast-orte .forecast-ort-checkbox')
    .forEach(cb => { cb.checked = true; });
}

function forecastSelectNoOrte() {
  document.querySelectorAll('#forecast-orte .forecast-ort-checkbox')
    .forEach(cb => { cb.checked = false; });
}

function getForecastOrtNameById(id) {
  const ort = _forecastOrteItems.find(o => String(o.id) === String(id));
  return ort?.name || ort?.bezeichnung || `Ort ${id}`;
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

async function getForecastPayload() {
  const settings = await apiGet('/api/app/settings');
  const getSettingValue = (key, fallback) => {
    const value = Array.isArray(settings)
      ? settings.find(item => item.key === key)?.value
      : settings?.[key];
    return value ?? fallback;
  };

  return {
    hours: getForecastRangeHours(),
    thresholds: {
      max_wind_ms: parseFloat(getSettingValue('forecast_default_max_wind_ms', 3.5)),
      max_precip_mm: parseFloat(getSettingValue('forecast_default_max_precip_mm', 0.0)),
      min_temp_c: parseFloat(getSettingValue('forecast_default_min_temp_c', 8.0)),
      max_temp_c: parseFloat(getSettingValue('forecast_default_max_temp_c', 25.0)),
      min_humidity_pct: parseFloat(getSettingValue('forecast_default_min_humidity_pct', 50.0)),
      min_window_hours: parseInt(document.getElementById('forecast-min-window-hours')?.value || '2', 10),
      dry_hours_after: parseInt(getSettingValue('forecast_default_dry_hours_after', 3), 10),
      min_hour: parseInt(getSettingValue('forecast_default_min_hour', 6), 10),
      max_hour: parseInt(getSettingValue('forecast_default_max_hour', 23), 10),
    }
  };
}

async function calculateForecastWindow() {
  const ortIds = getSelectedForecastOrtIds();

  if (!ortIds.length) {
    renderForecastError('Bitte mindestens einen Ort auswählen.');
    return;
  }

  renderForecastLoading(true);
  renderForecastError('');
  clearForecastResult();

  try {
    const payload = await getForecastPayload();
    const results = await Promise.all(
      ortIds.map(async (ortId) => {
        try {
          const result = await apiPost(`/api/orte/${ortId}/spray-window`, payload);
          return {
            ort_id: ortId,
            ort_name: getForecastOrtNameById(ortId),
            ok: !result?.error,
            data: result
          };
        } catch (err) {
          return {
            ort_id: ortId,
            ort_name: getForecastOrtNameById(ortId),
            ok: false,
            error: err?.message || 'Fehler beim Laden'
          };
        }
      })
    );

    renderForecastLoading(false);
    renderForecastMultiResult(results);
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

function renderForecastMultiResult(results) {
  const bestEl = document.getElementById('forecast-best-window');
  const altWrap = document.getElementById('forecast-alt-wrap');
  const altList = document.getElementById('forecast-alt-list');

  if (!bestEl || !altWrap || !altList) return;

  const successful = results.filter(r => r.ok && r.data);
  const failed = results.filter(r => !r.ok);

  if (!successful.length) {
    bestEl.className = 'forecast-best-window';
    bestEl.innerHTML = `
      <div class="forecast-best-title">Keine Vorhersage verfügbar</div>
      <div>Für die ausgewählten Orte konnten keine Ergebnisse geladen werden.</div>
    `;
    bestEl.classList.remove('hidden');

    altList.innerHTML = failed.map(r => `
      <div class="forecast-window-item">
        <div class="forecast-window-title">${escapeHtml(r.ort_name)}</div>
        <div>Fehler: <strong>${escapeHtml(r.error || 'Unbekannter Fehler')}</strong></div>
      </div>
    `).join('');

    altWrap.classList.toggle('hidden', !failed.length);
    return;
  }

  const ranked = successful
    .map(r => ({
      ...r,
      best_window: r.data?.best_window || null,
      windows: Array.isArray(r.data?.windows) ? r.data.windows : []
    }))
    .sort((a, b) => {
      const aScore = a.best_window?.avg_score ?? -Infinity;
      const bScore = b.best_window?.avg_score ?? -Infinity;
      return bScore - aScore;
    });

  const bestOverall = ranked[0];

  if (!bestOverall.best_window) {
    bestEl.className = 'forecast-best-window';
    bestEl.innerHTML = `
      <div class="forecast-best-title">Kein passendes Zeitfenster gefunden</div>
      <div>Für keinen der ausgewählten Orte wurde mit den aktuellen Thresholds ein geeignetes Spritzfenster erkannt.</div>
    `;
    bestEl.classList.remove('hidden');
  } else {
    const best = bestOverall.best_window;

    bestEl.className = 'forecast-best-window is-good';
    bestEl.innerHTML = `
      <div class="forecast-best-title">Bestes Zeitfenster über alle Orte</div>
      <div class="forecast-best-time">${formatForecastWindow(best.start, best.end)}</div>
      <div><strong>Ort:</strong> ${escapeHtml(bestOverall.ort_name)}</div>

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
  }

  altList.innerHTML = ranked.map(r => {
    const best = r.best_window;

    if (!best) {
      return `
        <div class="forecast-window-item">
          <div class="forecast-window-title">${escapeHtml(r.ort_name)}</div>
          <div>Kein passendes Zeitfenster gefunden.</div>
        </div>
      `;
    }

    const alternatives = r.windows.slice(1, 3);

    return `
      <div class="forecast-window-item">
        <div class="forecast-window-title">${escapeHtml(r.ort_name)}</div>
        <div>${formatForecastWindow(best.start, best.end)}</div>
        <div>Dauer: <strong>${best.duration_hours} h</strong> · Score: <strong>${best.avg_score}</strong></div>
        ${
          alternatives.length
            ? `<div class="forecast-sublist">
                ${alternatives.map((w, idx) => `
                  <div class="forecast-subitem">
                    Alt ${idx + 1}: ${formatForecastWindow(w.start, w.end)}
                    · <strong>${w.duration_hours} h</strong>
                    · Score <strong>${w.avg_score}</strong>
                  </div>
                `).join('')}
              </div>`
            : ''
        }
      </div>
    `;
  }).join('');

  if (failed.length) {
    altList.innerHTML += failed.map(r => `
      <div class="forecast-window-item">
        <div class="forecast-window-title">${escapeHtml(r.ort_name)}</div>
        <div>Fehler: <strong>${escapeHtml(r.error || 'Unbekannter Fehler')}</strong></div>
      </div>
    `).join('');
  }

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
