const ART_SUBKATEGORIEN = {
'Behandlung von Freilandflächen': [
    'Flächenkulturen',
    'Raumkulturen',
    'Forst',
    'Nichtkulturland'
],
'Behandlung geschlossener Räume bzw. in geschlossenen Räumen': [
    'Gewächshaus',
    'Lagerraum',
    'Sonstige geschlossene Räume'
],
'Behandlung von Saatgut oder Pflanzenvermehrungsmaterial': [
    'Saatgut',
    'Pflanzenvermehrungsmaterial'
]
};

function syncBadgeCount(id, value) {
const el = document.getElementById(id);
if (el) el.textContent = String(value);
}

function updateArtSubkategorie() {
const haupt = document.getElementById('exp-art-haupt');
const sub = document.getElementById('exp-art-sub');
if (!haupt || !sub) return;

const current = haupt.value;
const values = ART_SUBKATEGORIEN[current] || ['Allgemein'];
const prev = sub.value;

sub.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join('');
if (values.includes(prev)) sub.value = prev;

syncArtVerwendungField();
}

function syncArtVerwendungField() {
const haupt = document.getElementById('exp-art-haupt');
const sub = document.getElementById('exp-art-sub');
const target = document.getElementById('exp-artVerwendung');
if (!haupt || !sub || !target) return;

target.value = sub.value ? `${haupt.value} – ${sub.value}` : haupt.value;
syncLegacyExportUI();
}

function syncLegacyExportUI() {
const payload = (typeof getExportPayload === 'function') ? getExportPayload() : null;
const previewBtn  = document.getElementById('btn-preview');
const btnSave     = document.getElementById('btn-save');
const btnDownload = document.getElementById('btn-download');
const msg = document.getElementById('validation-msg');
if (!payload) return;

const hasPSM  = payload.psm_overrides.length > 0;
const hasEO   = payload.einsatzort_ids.length > 0;
const hasKult = payload.kult_overrides.length > 0;
const hasDate = !!payload.anwendung.datum;
const hasTime = !!payload.anwendung.uhrzeit;
const hasArt  = !!payload.anwendung.artVerwendung;
const hasPSMAmount = hasPSM && payload.psm_overrides.every(p => !!p.aufwandMenge);
const hasKultBBCH = hasKult && payload.kult_overrides.every(k => !!k.bbchCode);
const valid   = hasPSM && hasEO && hasKult && hasDate && hasTime && hasArt && hasPSMAmount && hasKultBBCH;

if (previewBtn) previewBtn.disabled = !valid;

// Determine which action button is active based on current save mode
const localSave = (typeof isLocalSaveMode === 'function') ? isLocalSaveMode() : true;
if (btnSave) {
    btnSave.style.display = localSave ? '' : 'none';
    btnSave.disabled = !valid;
}
if (btnDownload) {
    btnDownload.style.display = localSave ? 'none' : '';
    btnDownload.disabled = !valid;
}

if (msg) {
    if (valid) {
    msg.style.display = 'none';
    msg.textContent = '';
    } else {
    msg.style.display = 'block';
    msg.textContent = 'Bitte mindestens ein Pflanzenschutzmittel, einen Einsatzort, eine Kultur sowie Datum, Uhrzeit und Art der Verwendung auswählen. Aufwandsmenge und BBCH-Code sind erforderlich.';
    }
}
}

function patchFunction(name, afterFn) {
const original = window[name];
if (typeof original !== 'function') return;
window[name] = async function(...args) {
    const result = await original.apply(this, args);
    try { afterFn(); } catch (_) {
    // Optional UI refresh hooks must never break the original action.
    }
    return result;
};
}

if (typeof previewJSON === 'function') {
const originalPreviewJSON = previewJSON;
previewJSON = async function(...args) {
    const result = await originalPreviewJSON.apply(this, args);
    const wrap = document.getElementById('json-preview-wrap');
    if (wrap) wrap.style.display = 'block';
    syncLegacyExportUI();
    return result;
};
}

document.addEventListener('change', (event) => {
const watched = [
    'exp-datum', 'exp-uhrzeit', 'exp-anwender', 'exp-verantwortlich',
    'exp-art-haupt', 'exp-art-sub', 'save-mode-toggle'
];
if (watched.includes(event.target.id) || event.target.matches('.exp-psm-check, .exp-einsatzort-check, .exp-kultur-check, .exp-psm-amount, .exp-kultur-bbch')) {
    syncLegacyExportUI();
}
});

document.addEventListener('input', (event) => {
if (event.target.matches('#exp-anwender, #exp-verantwortlich, .exp-psm-amount, .exp-kultur-bbch')) {
    syncLegacyExportUI();
}
});
/* ── Mobile nav helpers ── */
function toggleMobileNav(source = 'legacy') {
if (source !== 'vue' && window.psmVueApp?.toggleMobileNav) {
    window.psmVueApp.toggleMobileNav();
    return;
}
const nav = document.querySelector('nav');
const overlay = document.getElementById('psm-vue-overlay');
const open = nav.classList.toggle('open');
overlay?.classList.toggle('open', open);
}
function closeMobileNav(source = 'legacy') {
if (source !== 'vue' && window.psmVueApp?.closeMobileNav) {
    window.psmVueApp.closeMobileNav();
    return;
}
document.querySelector('nav').classList.remove('open');
document.getElementById('psm-vue-overlay')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
updateArtSubkategorie();
syncLegacyExportUI();

// Init wizard toggle labels (local save is default = checked)
if (typeof updateWizSaveModeLabels === 'function') {
    const wizToggle = document.getElementById('wiz-save-mode-toggle');
    updateWizSaveModeLabels(wizToggle ? wizToggle.checked : true);
}

// Init settings toggle labels — driven by loadSettings() once settings arrive
// but set a sane default immediately so the UI isn't blank
if (typeof updateExportButtons === 'function') {
    updateExportButtons(true); // default: local save
}

const hidden = document.getElementById('exp-artVerwendung');
if (hidden && hidden.value) {
    const [haupt, sub] = hidden.value.split(' – ');
    const hauptSelect = document.getElementById('exp-art-haupt');
    if (hauptSelect && haupt) hauptSelect.value = haupt;
    updateArtSubkategorie();
    const subSelect = document.getElementById('exp-art-sub');
    if (subSelect && sub) subSelect.value = sub;
    syncArtVerwendungField();
}
});
document.addEventListener("DOMContentLoaded", () => {
const uhrzeit = document.getElementById("exp-uhrzeit");

if (uhrzeit && !uhrzeit.value) {
const now = new Date();
const hh = String(now.getHours()).padStart(2, "0");
const mm = String(now.getMinutes()).padStart(2, "0");
uhrzeit.value = `${hh}:${mm}`;
}
});
