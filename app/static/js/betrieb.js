let betriebExists = false;

function fillBetriebForm(betrieb) {
  if (window.psmVueApp?.applyBetriebForm) {
    window.psmVueApp.applyBetriebForm(betrieb);
    return;
  }

  const fields = ['firma', 'name', 'vorname', 'strHnr', 'plz', 'ort'];
  fields.forEach(field => {
    const el = $(`b-${field}`);
    if (el) el.value = betrieb[field] || '';
  });

  const bundesland = $('b-bundesland');
  if (bundesland) {
    bundesland.value = betrieb.bundesland || 'BW';
  }
}

function collectBetriebForm() {
  if (window.psmVueApp?.collectBetriebForm) {
    return window.psmVueApp.collectBetriebForm();
  }

  return {
    firma: $('b-firma') ? $('b-firma').value.trim() : '',
    name: $('b-name') ? $('b-name').value.trim() : '',
    vorname: $('b-vorname') ? $('b-vorname').value.trim() : '',
    strHnr: $('b-strHnr') ? $('b-strHnr').value.trim() : '',
    plz: $('b-plz') ? $('b-plz').value.trim() : '',
    ort: $('b-ort') ? $('b-ort').value.trim() : '',
    bundesland: $('b-bundesland') ? $('b-bundesland').value : 'BW'
  };
}

function collectWizardBetriebForm() {
  if (window.psmVueApp?.collectWizardBetriebForm) {
    return window.psmVueApp.collectWizardBetriebForm();
  }

  return {
    firma: $('wiz-firma') ? $('wiz-firma').value.trim() : '',
    name: $('wiz-name') ? $('wiz-name').value.trim() : '',
    vorname: $('wiz-vorname') ? $('wiz-vorname').value.trim() : '',
    strHnr: $('wiz-strHnr') ? $('wiz-strHnr').value.trim() : '',
    plz: $('wiz-plz') ? $('wiz-plz').value.trim() : '',
    ort: $('wiz-ort') ? $('wiz-ort').value.trim() : '',
    bundesland: $('wiz-bundesland') ? $('wiz-bundesland').value : 'BW',
    verantwortlicher: $('wiz-anwendungsverantwortlicher') ? $('wiz-anwendungsverantwortlicher').value.trim() : '',
    anwender: $('wiz-anwender') ? $('wiz-anwender').value.trim() : ''
  };
}

function openBetriebWizard() {
  openModal('modal-betrieb-wizard');
}

function closeBetriebWizard() {
  closeModal('modal-betrieb-wizard');
}

async function loadBetrieb() {
  if (window.psmVueApp?.loadBetrieb) {
    return window.psmVueApp.loadBetrieb();
  }

  try {
    const betrieb = await apiGet('/api/betrieb');

    if (!betrieb || !betrieb.id) {
      betriebExists = false;
      if ($('modal-betrieb-wizard')) {
        openBetriebWizard();
      }
      return;
    }

    betriebExists = true;
    fillBetriebForm(betrieb);
  } catch (err) {
    console.error(err);
    toast('❌ Betrieb konnte nicht geladen werden');
  }
}

async function saveBetrieb() {
  if (window.psmVueApp?.saveBetrieb) {
    return window.psmVueApp.saveBetrieb();
  }

  try {
    const payload = collectBetriebForm();
    await apiPost('/api/betrieb', payload);
    betriebExists = true;
    toast('✅ Betrieb gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

async function saveBetriebWizard() {
  if (window.psmVueApp?.saveBetriebWizard) {
    return window.psmVueApp.saveBetriebWizard();
  }

  try {
    const payload = collectWizardBetriebForm();

    await apiPost('/api/betrieb', {
      firma:      payload.firma,
      name:       payload.name,
      vorname:    payload.vorname,
      strHnr:     payload.strHnr,
      plz:        payload.plz,
      ort:        payload.ort,
      bundesland: payload.bundesland
    });

    // Read save mode from the wizard toggle (default: local save = true)
    const wizSaveMode = (typeof collectWizardSaveMode === 'function')
      ? collectWizardSaveMode()
      : { local_save: true, browser_download: false };

    await apiPost('/api/user/settings', {
      browser_download:       wizSaveMode.browser_download,
      local_save:              wizSaveMode.local_save,
      default_anwender:        payload.anwender,
      default_verantwortlich:  payload.verantwortlicher
    });

    // Sync the settings-tab toggle to match what was chosen in the wizard
    const settingsToggle = $('save-mode-toggle');
    if (settingsToggle) {
      settingsToggle.checked = wizSaveMode.local_save;
      if (typeof updateSaveModeLabels === 'function') updateSaveModeLabels(wizSaveMode.local_save);
    }

    if (typeof updateExportButtons === 'function') updateExportButtons(wizSaveMode.local_save);

    applyDefaultSettingsToExport({
      default_anwender:        payload.anwender,
      default_verantwortlich:  payload.verantwortlicher
    });

    if ($('set-default-anwender'))       $('set-default-anwender').value       = payload.anwender       || '';
    if ($('set-default-verantwortlich')) $('set-default-verantwortlich').value = payload.verantwortlicher || '';

    fillBetriebForm(payload);
    betriebExists = true;
    closeBetriebWizard();
    toast('✅ Betriebsdaten gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}
