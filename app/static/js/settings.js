async function loadSettings() {
  try {
    const settings = await apiGet('/api/user/settings');

    const browserDownload = $('set-browser-download');
    const localSave = $('set-local-save');
    const defaultAnwender = $('set-default-anwender');
    const defaultVerantwortlich = $('set-default-verantwortlich');

    if (browserDownload) {
      browserDownload.checked = !!settings.browser_download;
    }

    if (localSave) {
      localSave.checked = !!settings.local_save;
    }

    if (defaultAnwender) {
      defaultAnwender.value = settings.default_anwender || '';
    }

    if (defaultVerantwortlich) {
      defaultVerantwortlich.value = settings.default_verantwortlich || '';
    }

    applyDefaultSettingsToExport(settings);
  } catch (err) {
    console.error(err);
    toast('❌ Einstellungen konnten nicht geladen werden');
  }
}

function collectSettingsForm() {
  return {
    browser_download: $('set-browser-download') ? $('set-browser-download').checked : true,
    local_save: $('set-local-save') ? $('set-local-save').checked : true,
    default_anwender: $('set-default-anwender') ? $('set-default-anwender').value.trim() : '',
    default_verantwortlich: $('set-default-verantwortlich') ? $('set-default-verantwortlich').value.trim() : ''
  };
}

async function saveSettings() {
  try {
    const payload = collectSettingsForm();
    const result = await apiPost('/api/user/settings', payload);

    applyDefaultSettingsToExport(result.settings || payload);
    toast('✅ Einstellungen gespeichert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function applyDefaultSettingsToExport(settings) {
  const anwenderInput = $('exp-anwender');
  const verantwortlichInput = $('exp-verantwortlich');

  if (anwenderInput && !anwenderInput.value.trim() && settings.default_anwender) {
    anwenderInput.value = settings.default_anwender;
  }

  if (verantwortlichInput && !verantwortlichInput.value.trim() && settings.default_verantwortlich) {
    verantwortlichInput.value = settings.default_verantwortlich;
  }
}

async function renameUser() {
  const input = $('rename-input');
  if (!input) return;

  const username = input.value.trim();
  if (!username) {
    toast('❌ Bitte einen Benutzernamen eingeben');
    return;
  }

  try {
    await apiPost('/api/user/rename', { username });

    const nameLabel = $('user-name-label');
    const popupUsername = $('popup-username');
    const avatar = $('user-avatar');

    if (nameLabel) nameLabel.textContent = username;
    if (popupUsername) popupUsername.textContent = username;
    if (avatar) avatar.textContent = username.charAt(0).toUpperCase();

    input.value = '';
    input.placeholder = username;

    toast('✅ Benutzername geändert');
  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}