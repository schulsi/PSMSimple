const PSM_PREFIX = 'psm-history';

function buildPSMHistoryUrl() {
  return buildDateFilterUrl(PSM_PREFIX, '/api/history/psm-usage');
}

function resetPSMHistoryFilter() {
  resetDateFilter(PSM_PREFIX, loadPSMUsage);
}

function quickSelectPSMHistory(range) {
  quickSelectDateRange(range, PSM_PREFIX, loadPSMUsage);
}

function renderPSMChart(ctx, items) {
  if (window.psmChart) window.psmChart.destroy();

  window.psmChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: items.map(item => item.psm_name),
      datasets: [{
        data: items.map(item => item.usage_count),
        backgroundColor: historyChartPalette(items.length),
        borderColor: '#f8f5ee',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#1c2b22', usePointStyle: true, boxWidth: 10, padding: 14 }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const item = items[context.dataIndex];
              let label = `${context.label}: ${context.parsed} Verwendungen`;
              if (item.total_quantity != null) {
                label += ` (${parseFloat(item.total_quantity.toFixed(3))} ${item.unit || ''})`.trim();
              }
              return label;
            }
          }
        }
      }
    }
  });
}

function renderPSMTable(items) {
  const rows = items.map(item => {
    const qty = item.total_quantity != null
      ? `${parseFloat(item.total_quantity.toFixed(3))} ${item.unit || ''}`.trim()
      : '—';
    return `
      <tr>
        <td>${escapeHtml(item.psm_name)}</td>
        <td>${item.usage_count}</td>
        <td>${qty}</td>
        <td>${item.last_used || '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="psm-usage-table">
      <thead>
        <tr>
          <th>Pflanzenschutzmittel</th>
          <th>Verwendungen</th>
          <th>Gesamtmenge</th>
          <th>Zuletzt verwendet</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadPSMUsage() {
  try {
    const items       = await apiGet(buildPSMHistoryUrl());
    const list        = $('psm-usage-list');
    const chartCanvas = $('psm-usage-chart');
    const count       = $('history-count');

    if (count) count.textContent = items.length;
    if (!list || !chartCanvas) return;

    const ctx = chartCanvas.getContext('2d');

    if (!items.length) {
      list.innerHTML = `<div class="empty">Keine PSM-Verwendungen im ausgewählten Zeitraum.</div>`;
      if (window.psmChart) window.psmChart.destroy();
      return;
    }

    renderPSMChart(ctx, items);
    list.innerHTML = renderPSMTable(items);

  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}
