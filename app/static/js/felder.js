/* ══════════════════════════════════════════════
   MAP PICKER  (Leaflet + OpenStreetMap)
   ══════════════════════════════════════════════ */
/* Leaflet Marker Fix (LOCAL PATHS) */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/media/marker-icon-2x.png",
  iconUrl: "/media/marker-icon.png",
  shadowUrl: "/media/marker-shadow.png",
});

let _eoMap = null;
let _eoMarker = null;
let _eoMapSelection = null; // { lat, lng } confirmed in map modal

const EO_MAP_DEFAULT = [51.1657, 10.4515];
const EO_MAP_DEFAULT_ZOOM = 6;
const EO_MAP_POINT_ZOOM = 15;

let einsatzorteItems = [];
let currentEinsatzortEditId = null;

/* NEU */
let orteItems = [];
let fieldKulturenItems = [];

function getOrtNameById(ortId) {
  const ort = orteItems.find((o) => String(o.id) === String(ortId));
  return ort?.name || ort?.bezeichnung || `Ort #${ortId}`;
}

function getFieldKulturNameById(kulturId) {
  if (!kulturId) return "";
  const kultur = fieldKulturenItems.find((k) => String(k.id) === String(kulturId));
  return kultur?.name || `Kultur #${kulturId}`;
}

/* NEU */
async function loadOrte(selectedOrtId = "") {
  const select = $("eo-ort_id");
  if (!select) return;

  try {
    orteItems = await apiGet("/api/orte");

    select.innerHTML = `
      <option value="">Bitte Ort wählen</option>
      ${orteItems
        .map(
          (ort) => `
        <option value="${ort.id}">
          ${escapeHtml(ort.name || ort.bezeichnung || `Ort ${ort.id}`)}
        </option>
      `,
        )
        .join("")}
    `;

    if (
      selectedOrtId !== "" &&
      selectedOrtId !== null &&
      selectedOrtId !== undefined
    ) {
      select.value = String(selectedOrtId);
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="">Orte konnten nicht geladen werden</option>`;
    toast("❌ Orte konnten nicht geladen werden");
  }
}

async function loadFieldKulturen(selectedKulturId = "") {
  const select = $("eo-kultur_id");
  if (!select) return;

  try {
    fieldKulturenItems = await apiGet("/api/kulturen");

    select.innerHTML = `
      <option value="">Keine Kultur</option>
      ${fieldKulturenItems
        .map(
          (kultur) => `
        <option value="${kultur.id}">
          ${escapeHtml(kultur.name || `Kultur ${kultur.id}`)}
        </option>
      `,
        )
        .join("")}
    `;

    if (
      selectedKulturId !== "" &&
      selectedKulturId !== null &&
      selectedKulturId !== undefined
    ) {
      select.value = String(selectedKulturId);
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="">Kulturen konnten nicht geladen werden</option>`;
    toast("❌ Kulturen konnten nicht geladen werden");
  }
}

function openMapModal() {
  openModal("modal-map");

  setTimeout(() => {
    if (!_eoMap) {
      apiGet("/api/betrieb")
        .then((betrieb) => {
          const plz = betrieb.plz;

          if (!plz) {
            throw new Error("Keine PLZ gefunden");
          }

          return apiGet(`/api/einsatzorte/cord2plz/${encodeURIComponent(plz)}`);
        })
        .then((data) => {
          let center = EO_MAP_DEFAULT;
          let zoom = EO_MAP_DEFAULT_ZOOM;

          const lat = parseFloat(data.lat);
          const lng = parseFloat(data.lon);

          if (!isNaN(lat) && !isNaN(lng)) {
            center = [lat, lng];
            zoom = EO_MAP_POINT_ZOOM;
          } else {
            toast("❌ PLZ nicht gefunden");
          }

          _eoMap = L.map("eo-map", { zoomControl: true }).setView(center, zoom);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(_eoMap);

          _eoMap.on("click", (e) => _eoMapSetPoint(e.latlng.lat, e.latlng.lng));
          _eoMap.invalidateSize();

          if (!isNaN(lat) && !isNaN(lng)) {
            _eoMapSetPoint(lat, lng);
          }
        })
        .catch((err) => {
          console.error(err);
          toast(`❌ ${err.message}`);

          _eoMap = L.map("eo-map", { zoomControl: true }).setView(
            EO_MAP_DEFAULT,
            EO_MAP_DEFAULT_ZOOM,
          );

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(_eoMap);

          _eoMap.on("click", (e) => _eoMapSetPoint(e.latlng.lat, e.latlng.lng));
          _eoMap.invalidateSize();
        });

      return;
    }

    _eoMap.invalidateSize();

    const lat = parseFloat(document.getElementById("eo-gpsRechtswert")?.value);
    const lng = parseFloat(document.getElementById("eo-gpsHochwert")?.value);

    if (!isNaN(lat) && !isNaN(lng)) {
      _eoMapSetPoint(lat, lng);
    }
  }, 80);
}

function closeMapModal() {
  closeModal("modal-map");
}

function _eoMapSetPoint(lat, lng) {
  const latR = parseFloat(lat.toFixed(6));
  const lngR = parseFloat(lng.toFixed(6));

  _eoMapSelection = { lat: latR, lng: lngR };

  const latEl = document.getElementById("map-lat-display");
  const lngEl = document.getElementById("map-lng-display");
  if (latEl) latEl.textContent = latR;
  if (lngEl) lngEl.textContent = lngR;

  const btn = document.getElementById("map-confirm-btn");
  if (btn) btn.disabled = false;

  if (_eoMarker) {
    _eoMarker.setLatLng([latR, lngR]);
  } else {
    _eoMarker = L.marker([latR, lngR], { draggable: true }).addTo(_eoMap);
    _eoMarker.on("dragend", (e) => {
      const p = e.target.getLatLng();
      _eoMapSetPoint(p.lat, p.lng);
    });
  }

  _eoMap.setView([latR, lngR], Math.max(_eoMap.getZoom(), EO_MAP_POINT_ZOOM));
}

function confirmMapSelection() {
  if (!_eoMapSelection) return;

  const latInput = document.getElementById("eo-gpsRechtswert");
  const lngInput = document.getElementById("eo-gpsHochwert");
  if (latInput) latInput.value = _eoMapSelection.lat;
  if (lngInput) lngInput.value = _eoMapSelection.lng;

  closeMapModal();
  toast("📍 Koordinaten übernommen");
}

function _eoResetMap() {
  if (_eoMarker) {
    _eoMarker.remove();
    _eoMarker = null;
  }
  _eoMapSelection = null;

  const latEl = document.getElementById("map-lat-display");
  const lngEl = document.getElementById("map-lng-display");
  if (latEl) latEl.textContent = "—";
  if (lngEl) lngEl.textContent = "—";

  const btn = document.getElementById("map-confirm-btn");
  if (btn) btn.disabled = true;

  if (_eoMap) _eoMap.setView(EO_MAP_DEFAULT, EO_MAP_DEFAULT_ZOOM);
}

function renderEinsatzorteList(items = einsatzorteItems) {
  const list = $("einsatzorte-list");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="empty">Noch keine Felder vorhanden.</div>`;
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <div class="item">
      <div class="item-info">
        <div class="name">${escapeHtml(item.name || "—")}</div>
        <div class="meta">
          ${escapeHtml(getOrtNameById(item.ort_id))} ·
          ${item.kultur_id ? `${escapeHtml(getFieldKulturNameById(item.kultur_id))} ·` : ""}
          ${escapeHtml(item.anwendungsbereich || "—")} ·
          ${escapeHtml(item.geoTyp || "—")}
        </div>
        <div class="meta">
          ${escapeHtml(item.flaecheVolumen || "—")} ${escapeHtml(item.einheit || "")}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" data-action="editEinsatzort" data-id="${item.id}">Bearbeiten</button>
        <button class="btn btn-sm btn-danger" data-action="removeEinsatzort" data-id="${item.id}">Löschen</button>
      </div>
    </div>
  `,
    )
    .join("");
}

async function loadEinsatzorte() {
  try {
    /* wichtig: zuerst Stammdaten laden, dann Einsatzorte rendern */
    await Promise.all([loadOrte(), loadFieldKulturen()]);

    einsatzorteItems = await apiGet("/api/einsatzorte");

    const count = document.getElementById("eo-count");
    renderEinsatzorteList();

    if (count) count.textContent = String(einsatzorteItems.length);
    if (typeof loadExportSelections === "function") {
      loadExportSelections();
    }
  } catch (err) {
    console.error(err);
    toast("❌ Felder konnten nicht geladen werden");
  }
}

async function resetEinsatzortForm() {
  currentEinsatzortEditId = null;

  const defaultValues = {
    name: "",
    gpsRechtswert: "",
    gpsHochwert: "",
    anwendungsbereich: "Freiland",
    geoTyp: "GPS-Koordinaten",
    einheit: "m2",
    flaecheVolumen: "",
  };

  Object.entries(defaultValues).forEach(([field, value]) => {
    const el = $(`eo-${field}`);
    if (el) el.value = value;
  });

  await loadOrte("");
  await loadFieldKulturen("");

  const modalTitle = $("modal-einsatzort-title");
  if (modalTitle) modalTitle.textContent = "Feld hinzufügen";

  _eoResetMap();
}

function collectEinsatzortForm() {
  return {
    name: $("eo-name") ? $("eo-name").value.trim() : "",
    gpsRechtswert: $("eo-gpsRechtswert")
      ? $("eo-gpsRechtswert").value.trim()
      : "",
    gpsHochwert: $("eo-gpsHochwert") ? $("eo-gpsHochwert").value.trim() : "",
    anwendungsbereich: $("eo-anwendungsbereich")
      ? $("eo-anwendungsbereich").value.trim()
      : "",
    geoTyp: $("eo-geoTyp") ? $("eo-geoTyp").value.trim() : "",
    einheit: $("eo-einheit") ? $("eo-einheit").value.trim() : "",
    flaecheVolumen: $("eo-flaecheVolumen")
      ? $("eo-flaecheVolumen").value.trim()
      : "",
    ort_id: $("eo-ort_id") ? $("eo-ort_id").value : "",
    kultur_id: $("eo-kultur_id") ? $("eo-kultur_id").value : "",
  };
}

async function openEinsatzortModal() {
  await resetEinsatzortForm();
  openModal("modal-einsatzort");
}

async function openOrtModal() {
  await resetOrtForm();
  openModal("modal-ort");
}

async function editEinsatzort(id) {
  try {
    const item = await apiGet(`/api/einsatzorte/${id}`);
    currentEinsatzortEditId = id;

    [
      "name",
      "gpsRechtswert",
      "gpsHochwert",
      "anwendungsbereich",
      "geoTyp",
      "einheit",
      "flaecheVolumen",
    ].forEach((field) => {
      const el = $(`eo-${field}`);
      if (el) el.value = item[field] || "";
    });

    await loadOrte(item.ort_id);
    await loadFieldKulturen(item.kultur_id);

    const modalTitle = $("modal-einsatzort-title");
    if (modalTitle) modalTitle.textContent = "Feld bearbeiten";

    openModal("modal-einsatzort");

    const _lat = parseFloat(item.gpsRechtswert);
    const _lng = parseFloat(item.gpsHochwert);
    if (!isNaN(_lat) && !isNaN(_lng))
      _eoMapSelection = { lat: _lat, lng: _lng };
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function saveEinsatzort() {
  try {
    const payload = collectEinsatzortForm();

    if (!payload.name) {
      toast("❌ Bitte einen Namen eingeben");
      return;
    }

    if (!payload.ort_id) {
      toast("❌ Bitte einen Ort auswählen");
      return;
    }

    if (currentEinsatzortEditId) {
      await apiPut(`/api/einsatzorte/${currentEinsatzortEditId}`, payload);
      toast("✅ Feld gespeichert");
    } else {
      await apiPost("/api/einsatzorte", payload);
      toast("✅ Feld hinzugefügt");
    }

    closeModal("modal-einsatzort");
    await resetEinsatzortForm();
    await loadEinsatzorte();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function removeEinsatzort(id) {
  if (!confirm("Dieses Feld wirklich löschen?")) return;

  try {
    await apiDelete(`/api/einsatzorte/${id}`);
    toast("✅ Feld gelöscht");
    await loadEinsatzorte();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

// -----------------------------------------------------------------------
// Orte (anlegen)
// -----------------------------------------------------------------------

let currentOrtEditId = null;

function resetOrtForm() {
  currentOrtEditId = null;
  const name = document.getElementById("o-name");
  const plz = document.getElementById("o-plz");
  if (name) name.value = "";
  if (plz) plz.value = "";

  const title = document.getElementById("modal-ort-title");
  if (title) title.textContent = "Neuer Ort";
}

function collectOrtForm() {
  return {
    name: document.getElementById("o-name")?.value.trim() || "",
    plz: document.getElementById("o-plz")?.value.trim() || "",
  };
}

async function saveOrt() {
  const payload = collectOrtForm();

  if (!payload.name) {
    toast("❌ Bitte einen Namen eingeben");
    return;
  }
  if (!payload.plz) {
    toast("❌ Bitte eine PLZ eingeben");
    return;
  }

  try {
    if (currentOrtEditId) {
      await apiPut(`/api/orte/${currentOrtEditId}`, payload);
      toast("✅ Ort gespeichert");
    } else {
      await apiPost("/api/orte", payload);
      toast("✅ Ort hinzugefügt");
    }

    closeModal("modal-ort");
    resetOrtForm();
    // Orte-Dropdown im Einsatzort-Formular aktualisieren
    await loadOrte();
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}
