

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates('history');
  setDefaultDates('psm-history');
  setDefaultDates('fields-history');

  loadHistory();

  $('history-date-from')?.addEventListener('change', loadHistory);
  $('history-date-to')  ?.addEventListener('change', loadHistory);

  $('psm-history-date-from')?.addEventListener('change', loadPSMUsage);
  $('psm-history-date-to')  ?.addEventListener('change', loadPSMUsage);

   $('fields-history-date-from')?.addEventListener('change', loadFieldsUsage);
  $('fields-history-date-to')  ?.addEventListener('change', loadFieldsUsage);
});

function showHistorySubTab(tabName) {
  document.querySelectorAll('.history-sub-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn')    .forEach(btn => btn.classList.remove('active'));

  // Detailansicht beim Tab-Wechsel verstecken
  const detailWrap = $('history-detail-wrap');
  if (detailWrap) {
    detailWrap.classList.remove('visible');
    detailWrap.classList.add('hidden');
  }

  document.getElementById(`history-sub-${tabName}`)?.classList.add('active');
  event.target.classList.add('active');

  if (tabName === 'psm-usage')    loadPSMUsage();
  if (tabName === 'fields-usage') loadFieldsUsage();
}
