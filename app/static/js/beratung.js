// -----------------------------------------------------------------------
// PSM-Beratung
// -----------------------------------------------------------------------

let _beratungInitialized = false;
let _schadDebounceTimer = null;
let _selectedSchadorg = null;   // { kode, bezeichnung }
let _mittelStream = null;       // aktiver EventSource

function initBeratungTab() {
  if (_beratungInitialized) return;
  _beratungInitialized = true;
  loadBeratungKulturen();
  loadBeratungOrte();
  bindBeratungUI();
  //checkLLMStatus();
}

async function checkLLMStatus() {
  const btn = document.querySelector('[data-action="startBeratung"]');
  if (!btn) return;

  try {
    const result = await apiGet('/api/beratung/llm-status');
    if (!result?.configured) {
      btn.disabled = true;
      btn.title = `LLM nicht konfiguriert – bitte ${result.provider.toUpperCase()}_API_KEY setzen`;
      btn.textContent = '🤖 Beratung starten (nicht konfiguriert)';
    }
  } catch (err) {
    console.error('checkLLMStatus failed', err);
  }
}

function bindBeratungUI() {
  // Dropdown schließen bei Klick außerhalb
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.beratung-search-wrap')) {
      document.getElementById('beratung-schad-dropdown')?.classList.add('hidden');
    }
  });
  document.getElementById('beratung-schad-input')
    ?.addEventListener('input', onBeratungSchadInput);
}

// --- Kulturen laden ---

async function loadBeratungKulturen() {
  const sel = document.getElementById('beratung-kultur-select');
  if (!sel) return;
  try {
    const items = await apiGet('/api/kulturen');
    const list = Array.isArray(items) ? items : [];
    list.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k.id;
      opt.textContent = k.name + (k.eppoCode ? ` (${k.eppoCode})` : '');
      opt.dataset.eppo = k.eppoCode || '';
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('loadBeratungKulturen failed', err);
  }
}

// --- Orte laden ---

async function loadBeratungOrte() {
  const sel = document.getElementById('beratung-ort-select');
  if (!sel) return;
  try {
    const items = await apiGet('/api/orte');
    const list = Array.isArray(items) ? items : [];
    list.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.name || o.bezeichnung || `Ort ${o.id}`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('loadBeratungOrte failed', err);
  }
}

// --- Schadorganismus-Suche mit Debounce ---

function onBeratungSchadInput() {
  const input = document.getElementById('beratung-schad-input');
  const dropdown = document.getElementById('beratung-schad-dropdown');
  const q = input?.value?.trim() || '';

  clearTimeout(_schadDebounceTimer);

  if (q.length < 2) {
    dropdown?.classList.add('hidden');
    return;
  }

  _schadDebounceTimer = setTimeout(() => searchSchadorganismen(q), 350);
}

async function searchSchadorganismen(q) {
  const dropdown = document.getElementById('beratung-schad-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '<div class="beratung-dropdown-item beratung-dropdown-loading">Suche...</div>';
  dropdown.classList.remove('hidden');

  const input = document.getElementById('beratung-schad-input');
  const rect = input.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.width = `${rect.width}px`;

  const kulturId = document.getElementById('beratung-kultur-select')?.value;
  const params = new URLSearchParams({ q });
  if (kulturId) params.append('kultur_id', kulturId);

  try {
    const result = await apiGet(`/api/beratung/schadorganismen?${params.toString()}`);
    const items = result?.items || [];

    if (!items.length && !result?.partial) {
      dropdown.innerHTML = '<div class="beratung-dropdown-item beratung-dropdown-empty">Keine Treffer</div>';
      return;
    }

    renderDropdownItems(dropdown, items, result?.partial);

    // Nachladen falls partial
    if (result?.partial && result?.pending_kodes?.length) {
      ladeNachtraeglich(dropdown, result.pending_kodes, kulturId, items);
    }

  } catch (err) {
    dropdown.innerHTML = '<div class="beratung-dropdown-item beratung-dropdown-empty">Fehler bei der Suche</div>';
  }
}

function renderDropdownItems(dropdown, items, isPartial = false) {
  const loadingHint = isPartial
    ? '<div class="beratung-dropdown-item beratung-dropdown-loading">⏳ Weitere Ergebnisse werden geladen...</div>'
    : '';

  if (!items.length) {
    dropdown.innerHTML = loadingHint || '<div class="beratung-dropdown-item beratung-dropdown-empty">Keine Treffer</div>';
    return;
  }

  dropdown.innerHTML = items.map(item => `
    <div class="beratung-dropdown-item" data-kode="${escapeHtml(item.kode)}" data-bezeichnung="${escapeHtml(item.bezeichnung)}">
      <span class="beratung-dropdown-name">${escapeHtml(item.bezeichnung)}</span>
      <span class="beratung-dropdown-kode">${escapeHtml(item.kode)}</span>
    </div>
  `).join('') + loadingHint;

  dropdown.querySelectorAll('.beratung-dropdown-item[data-kode]').forEach(el => {
    el.addEventListener('click', () => {
      selectSchadorg(el.dataset.kode, el.dataset.bezeichnung);
    });
  });
}

async function ladeNachtraeglich(dropdown, pendingKodes, kulturId, existingItems) {
  try {
    const params = new URLSearchParams({ kodes: pendingKodes.join(',') });
    if (kulturId) params.append('kultur_id', kulturId);

    const result = await apiGet(`/api/beratung/schadorganismen/resolve?${params.toString()}`);
    const neueItems = result?.items || [];

    if (!neueItems.length) {
      dropdown.querySelector('.beratung-dropdown-loading')?.remove();
      if (!dropdown.querySelectorAll('[data-kode]').length) {
        dropdown.innerHTML = '<div class="beratung-dropdown-item beratung-dropdown-empty">Keine Treffer</div>';
      }
      return;
    }

    const alleItems = [...existingItems, ...neueItems]
      .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung));

    renderDropdownItems(dropdown, alleItems, false);

  } catch (err) {
    dropdown.querySelector('.beratung-dropdown-loading')?.remove();
  }
}

function selectSchadorg(kode, bezeichnung) {
  clearTimeout(_schadDebounceTimer);
  _selectedSchadorg = { kode, bezeichnung };

  const input = document.getElementById('beratung-schad-input');
  const hidden = document.getElementById('beratung-schad-kode');
  const selected = document.getElementById('beratung-schad-selected');
  const dropdown = document.getElementById('beratung-schad-dropdown');

  if (input) input.value = '';
  if (hidden) hidden.value = kode;
  if (dropdown) dropdown.classList.add('hidden');

  if (selected) {
    selected.innerHTML = `
      <span class="beratung-bubble beratung-bubble-schad">
        ${escapeHtml(bezeichnung)}
        <button type="button" class="beratung-bubble-remove">✕</button>
      </span>
    `;
    selected.querySelector('.beratung-bubble-remove')
      .addEventListener('click', clearSchadorg);
  }
}

function clearSchadorg() {
  _selectedSchadorg = null;
  const hidden = document.getElementById('beratung-schad-kode');
  const selected = document.getElementById('beratung-schad-selected');
  if (hidden) hidden.value = '';
  if (selected) selected.innerHTML = '';
}

// --- Beratung starten ---

async function startBeratung() {
  const kulturSel = document.getElementById('beratung-kultur-select');
  const ortSel = document.getElementById('beratung-ort-select');

  const kulturId = kulturSel?.value;
  const ortId = ortSel?.value || null;

  if (!kulturId) {
    showBeratungError('Bitte eine Kultur auswählen.');
    return;
  }
  if (!_selectedSchadorg) {
    showBeratungError('Bitte einen Schadorganismus auswählen.');
    return;
  }

  clearBeratungResult();
  showBeratungError('');
  document.getElementById('beratung-loading')?.classList.remove('hidden');
  document.getElementById('beratung-mittel-wrap')?.classList.add('hidden');

  // Laufenden Stream ggfs. abbrechen
  _cancelMittelStream();

  try {
    const aiEnabled = await apiGet('/api/app/settings/aiEnabled');

    // Mittel progressiv per SSE laden
    const mittel = await ladeMittelStream(kulturId, _selectedSchadorg.kode);

    document.getElementById('beratung-mittel-wrap')?.classList.remove('hidden');

    const empfehlungCard = document.getElementById('beratung-empfehlung-card');
    if (aiEnabled != 0) {
      empfehlungCard?.classList.remove('hidden');
      await ladeEmpfehlung(kulturId, ortId, mittel);
    } else {
      empfehlungCard?.classList.add('hidden');
    }

  } catch (err) {
    document.getElementById('beratung-loading')?.classList.add('hidden');
    showBeratungError(err?.message || 'Unbekannter Fehler.');
  }
}

// -----------------------------------------------------------------------
// Progressives Laden der Mittel via Server-Sent Events
// -----------------------------------------------------------------------

/**
 * Öffnet einen SSE-Stream zu /api/beratung/mittel/stream.
 * Rendert Mittel sofort wenn sie ankommen.
 * Gibt Promise<PSMMittelInfo[]> zurück wenn der Stream abgeschlossen ist.
 */
function ladeMittelStream(kulturId, schadorgKode) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById('beratung-mittel-list');
    const countEl   = document.getElementById('beratung-mittel-count');
    const wrapEl    = document.getElementById('beratung-mittel-wrap');

    // Fortschritts-UI aufbauen
    _renderMittelProgress(container, 0, null);
    wrapEl?.classList.remove('hidden');

    const params = new URLSearchParams({
      kultur_id: kulturId,
      schadorg_kode: schadorgKode,
    });

    const es = new EventSource(`/api/beratung/mittel/stream?${params.toString()}`);
    _mittelStream = es;

    const geladene = [];
    let total = null;

    es.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); }
      catch { return; }

      if (msg.type === 'progress') {
        total = msg.total;
        // Gesamtzahl sofort im Badge oben eintragen, Haupt-Spinner ausblenden
        if (countEl) countEl.textContent = total ? `0 / ${total}` : '…';
        document.getElementById('beratung-loading')?.classList.add('hidden');
        _updateMittelProgress(container, msg.loaded, msg.total, geladene.length);

      } else if (msg.type === 'mittel') {
        geladene.push(msg.mittel);
        _appendMittelCard(container, msg.mittel);
        // Badge: x / gesamt während geladen wird
        if (countEl) countEl.textContent = total ? `${geladene.length} / ${total}` : geladene.length;
        _updateMittelProgressCount(geladene.length, total);

      } else if (msg.type === 'done') {
        es.close();
        _mittelStream = null;
        _removeMittelProgress(container);
        // Badge: nur Endanzahl
        if (countEl) countEl.textContent = geladene.length;
        if (!geladene.length) {
          container.innerHTML = '<div class="empty">Keine zugelassenen Mittel gefunden.</div>';
        }
        resolve(geladene);

      } else if (msg.type === 'error') {
        es.close();
        _mittelStream = null;
        _removeMittelProgress(container);
        reject(new Error(msg.message || 'Stream-Fehler'));
      }
    };

    es.onerror = () => {
      es.close();
      _mittelStream = null;
      _removeMittelProgress(container);
      if (geladene.length) {
        // Partial-Ergebnis trotzdem liefern
        resolve(geladene);
      } else {
        reject(new Error('Verbindung zum Server unterbrochen.'));
      }
    };
  });
}

function _cancelMittelStream() {
  if (_mittelStream) {
    _mittelStream.close();
    _mittelStream = null;
  }
}

// --- Fortschritts-UI ---

const PROGRESS_ID = 'beratung-mittel-progress';

function _renderMittelProgress(container, loaded, total) {
  container.innerHTML = '';
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  const el = document.createElement('div');
  el.id = PROGRESS_ID;
  el.className = 'beratung-progress-wrap';
  el.innerHTML = `
    <div class="beratung-progress-bar-track" id="${PROGRESS_ID}-track">
      <div class="beratung-progress-bar-fill"></div>
    </div>
    <div class="beratung-progress-label" id="${PROGRESS_ID}-label">
      Lade Mittel… ${total ? `0 / ${total}` : ''}
    </div>
  `;
  container.prepend(el);
  el.querySelector('.beratung-progress-bar-track').style.setProperty('--pct', `${pct}%`);
}

function _updateMittelProgress(container, loaded, total, found) {
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  document.getElementById(`${PROGRESS_ID}-track`)?.style.setProperty('--pct', `${pct}%`);
  _updateMittelProgressCount(found, total);
}

function _updateMittelProgressCount(found, total) {
  const label = document.getElementById(`${PROGRESS_ID}-label`);
  if (!label) return;
  label.textContent = total
    ? `${found} / ${total} geladen`
    : `${found} geladen…`;
}

function _removeMittelProgress(container) {
  document.getElementById(PROGRESS_ID)?.remove();
}

// --- Einzelne Mittel-Karte anhängen ---

function _appendMittelCard(container, m) {
  // Fortschrittsleiste ans Ende verschieben damit neue Karten davor erscheinen
  const progressEl = document.getElementById(PROGRESS_ID);

  const risikoClass = m.geringes_risiko ? 'beratung-bubble-low-risk' : '';
  const risikoLabel = m.geringes_risiko
    ? '<span class="beratung-bubble-tag beratung-tag-green">geringes Risiko</span>'
    : '';
  const wartezeit = m.wartezeit_tage
    ? `<span class="beratung-bubble-tag">⏱ ${m.wartezeit_tage}d</span>`
    : '';
  const wirkstoffe = m.wirkstoffe?.length
    ? `<div class="beratung-bubble-sub">${m.wirkstoffe.slice(0, 2).map(w => escapeHtml(w)).join(', ')}</div>`
    : '';
  const aufwand = m.aufwand_info
    ? `<span class="beratung-bubble-tag">📏 ${escapeHtml(m.aufwand_info)}</span>`
    : '';
  const zulEnde = m.zul_ende
    ? `<span class="beratung-bubble-tag beratung-tag-muted">bis ${m.zul_ende.slice(0, 10)}</span>`
    : '';

  const card = document.createElement('div');
  card.className = `beratung-bubble-card ${risikoClass} beratung-card-enter`;
  card.innerHTML = `
    <div class="beratung-bubble-name">${escapeHtml(m.mittelname)}</div>
    ${wirkstoffe}
    <div class="beratung-bubble-tags">
      ${risikoLabel}${wartezeit}${aufwand}${zulEnde}
    </div>
  `;

  // Karte vor dem Fortschrittsbalken einfügen (oder ans Ende falls kein Balken mehr)
  if (progressEl && progressEl.parentNode === container) {
    container.insertBefore(card, progressEl);
  } else {
    container.appendChild(card);
  }

  // Einblend-Animation triggern (nächster Frame)
  requestAnimationFrame(() => card.classList.remove('beratung-card-enter'));
}

// --- LLM-Empfehlung laden ---

async function ladeEmpfehlung(kulturId, ortId, mittel) {
  const loadingEl = document.getElementById('beratung-empfehlung-loading');
  const errorEl   = document.getElementById('beratung-empfehlung-error');
  const resultEl  = document.getElementById('beratung-empfehlung-result');
  const metaEl    = document.getElementById('beratung-empfehlung-meta');

  loadingEl?.classList.remove('hidden');
  resultEl?.classList.add('hidden');
  metaEl?.classList.add('hidden');

  try {
    const result = await apiPost('/api/beratung/empfehlung', {
      kultur_id: parseInt(kulturId),
      schadorg_kode: _selectedSchadorg.kode,
      schadorg_name: _selectedSchadorg.bezeichnung,
      ort_id: ortId ? parseInt(ortId) : null,
    });

    loadingEl?.classList.add('hidden');

    if (!result?.ok) {
      if (errorEl) {
        errorEl.textContent = result?.message || 'Fehler bei der Empfehlung.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (resultEl) {
      resultEl.innerHTML = result.empfehlung
        .split('\n')
        .map(line => line ? `<p>${escapeHtml(line)}</p>` : '<br>')
        .join('');
      resultEl.classList.remove('hidden');
    }

    if (metaEl) {
      metaEl.textContent = `Erstellt mit ${result.model} (${result.provider})`;
      metaEl.classList.remove('hidden');
    }

  } catch (err) {
    loadingEl?.classList.add('hidden');
    if (errorEl) {
      errorEl.textContent = err?.message || 'Fehler bei der Empfehlung.';
      errorEl.classList.remove('hidden');
    }
  }
}

// --- Hilfsfunktionen ---

function showBeratungError(msg) {
  const el = document.getElementById('beratung-error');
  if (!el) return;
  if (!msg) { el.textContent = ''; el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearBeratungResult() {
  const list = document.getElementById('beratung-mittel-list');
  if (list) list.innerHTML = '';
  _cancelMittelStream();
  document.getElementById('beratung-empfehlung-card')?.classList.add('hidden');
  document.getElementById('beratung-empfehlung-result')?.classList.add('hidden');
  document.getElementById('beratung-empfehlung-meta')?.classList.add('hidden');
  document.getElementById('beratung-empfehlung-error')?.classList.add('hidden');
}

function showForecastSubTab(subtab, btn = null) {
  document.querySelectorAll('#tab-forecast .sub-tab-btn')
    .forEach(b => b.classList.remove('active'));

  document.querySelectorAll('#tab-forecast .history-sub-tab')
    .forEach(el => el.classList.remove('active'));

  if (btn) btn.classList.add('active');

  const target = document.getElementById(`forecast-sub-${subtab}`);
  if (target) target.classList.add('active');
  const badge = document.getElementById('forecast-status-badge');
  
  if (subtab === 'beratung') {
    if (badge) badge.textContent = 'PSM';
    initBeratungTab();
  }
  else if (subtab === 'spritzfenster') {
    if (badge) badge.textContent = 'Spritzfenster';
  }
}