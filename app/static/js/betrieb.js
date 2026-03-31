let betriebExists = false;

function fillBetriebForm(betrieb) {
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
  try {
    const payload = collectWizardBetriebForm();
    await apiPost('/api/betrieb', payload);
    const settings = await apiGet('/api/user/settings');
    settings.default_anwender = payload.anwender;
    settings.default_verantwortlich = payload.verantwortlicher;
    await apiPost('/api/user/settings', settings);

    fillBetriebForm(payload);
    betriebExists = true;
    closeBetriebWizard();
    toast('✅ Betriebsdaten gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}