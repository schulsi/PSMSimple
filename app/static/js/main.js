document.addEventListener('DOMContentLoaded', async () => {
  try {
    if ($('exp-datum') && !$('exp-datum').value) {
      $('exp-datum').value = new Date().toISOString().split('T')[0];
    }

    await Promise.all([
      loadBetrieb(),
      loadPSM(),
      loadEinsatzorte(),
      loadKulturen(),
      loadSettings()
    ]);

    initPSMSearch();
  } catch (err) {
    console.error(err);
    toast('❌ Fehler beim Laden der App');
  }
});