document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([
      loadBetrieb(),
      loadPSM(),
      loadEinsatzorte(),
      loadKulturen(),
      loadExportSelections(),
      loadSettings()
    ]);
  } catch (err) {
    console.error(err);
    toast('❌ Fehler beim Laden der App');
  }
});