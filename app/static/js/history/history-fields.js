const FIELDS_PREFIX = 'fields-history';

function buildFieldsHistoryUrl() {
  return buildDateFilterUrl(FIELDS_PREFIX, '/api/history/fields-usage');
}

function resetFieldsHistoryFilter() {
  resetDateFilter(FIELDS_PREFIX, loadFieldsUsage);
}

function quickSelectFieldsHistory(range) {
  quickSelectDateRange(range, FIELDS_PREFIX, loadFieldsUsage);
}

function renderFieldsChart(ctx, items) {
  if (window.fieldsChart) window.fieldsChart.destroy();

  window.fieldsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: items.map(item => item.field_name),
      datasets: [{
        label: 'Verwendungen',
        data: items.map(item => item.usage_count),
        backgroundColor: historyChartPalette(items.length),
        borderColor: '#f8f5ee',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const item = items[context.dataIndex];
              let label = `${context.label}: ${context.parsed.y} Verwendungen`;
              if (item.total_area) {
                label += ` (${item.total_area} ${item.unit || ''})`.trim();
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: '#1c2b22' },
          title: { display: true, text: 'Verwendungen', color: '#1c2b22' }
        },
        x: { ticks: { color: '#1c2b22' } }
      }
    }
  });
}

function renderFieldsTable(items) {
  const rows = items.map(item => {
    const safeId = escapeHtml(item.field_name).replace(/[^a-zA-Z0-9]/g, '_');
    const safeName = item.field_name.replace(/'/g, "\\'");
    return `
      <tr>
        <td>${escapeHtml(item.field_name)}</td>
        <td>${item.usage_count}</td>
        <td>${item.last_used || '—'}</td>
        <td>
          <button class="btn btn-sm btn-ghost"
                  data-action="toggleFieldDetails"
                  data-name='${safeName}'>🔽</button>
        </td>
      </tr>
      <tr id="details-${safeId}" class="field-details-row hidden">
        <td colspan="4" class="field-details-cell">
          <div class="field-details-loading">Lade Details...</div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="psm-usage-table">
      <thead>
        <tr>
          <th>Einsatzort (Feld)</th>
          <th>Verwendungen</th>
          <th>Zuletzt verwendet</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadFieldsUsage() {
  try {
    const items       = await apiGet(buildFieldsHistoryUrl());
    const list        = $('fields-usage-list');
    const chartCanvas = $('fields-usage-chart');
    const count       = $('history-count');

    if (count) count.textContent = items.length;
    if (!list || !chartCanvas) return;

    const ctx = chartCanvas.getContext('2d');

    if (!items.length) {
      list.innerHTML = `<div class="empty">Keine Feld-Verwendungen im ausgewählten Zeitraum.</div>`;
      if (window.fieldsChart) window.fieldsChart.destroy();
      return;
    }

    renderFieldsChart(ctx, items);
    list.innerHTML = renderFieldsTable(items);

  } catch (err) {
    console.error(err);
    toast(`❌ ${err.message}`);
  }
}

function renderFieldApplicationsTable(applications) {
  const rows = applications.map(app => `
    <tr>
      <td>${app.date}</td>
      <td>${app.time || '—'}</td>
      <td>${escapeHtml(app.psm_name)}</td>
      <td>${app.quantity ? `${app.quantity} ${app.unit || ''}`.trim() : '—'}</td>
      <td>${app.area    ? `${app.area} ${app.area_unit || ''}`.trim()  : '—'}</td>
      <td><a href="javascript:void(0)" data-action="showHistoryDetail" data-id="${app.id}">Anzeigen</a></td>
    </tr>
  `).join('');

  return `
    <table class="field-applications-table">
      <thead>
        <tr>
          <th>Datum</th><th>Uhrzeit</th><th>PSM</th>
          <th>Menge</th><th>Fläche</th><th>Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function toggleFieldDetails(fieldName, button) {
  const rowId      = `details-${escapeHtml(fieldName).replace(/[^a-zA-Z0-9]/g, '_')}`;
  const detailsRow = document.getElementById(rowId);

  if (!detailsRow) {
    toast(`❌ Details-Zeile nicht gefunden: ${rowId}`);
    return;
  }

  const isVisible = !detailsRow.classList.contains('hidden');

  if (isVisible) {
    detailsRow.classList.add('hidden');
    button.innerHTML = '🔽';
    return;
  }

  const detailsCell = detailsRow.querySelector('.field-details-cell');
  if (!detailsCell) {
    toast('❌ Fehler: Details-Zelle nicht gefunden');
    return;
  }

  detailsCell.innerHTML = '<div class="field-details-loading">Lade Details...</div>';
  detailsRow.classList.remove('hidden');
  button.innerHTML = '🔼';

  const startDate = document.getElementById('fields-history-date-from').value;
  const endDate   = document.getElementById('fields-history-date-to').value;

  apiGet(`/api/history/field-applications?field_name=${encodeURIComponent(fieldName)}&date_from=${startDate}&date_to=${endDate}`)
    .then(data => {
      if (!data.length) {
        detailsCell.innerHTML = '<div class="field-details-empty">Keine Anwendungen gefunden</div>';
        return;
      }

      const applications = data.flatMap(app =>
        app.psm_applications.map(psm => ({
          id: app.id, date: app.date, time: app.time,
          psm_name: psm.name, quantity: psm.quantity, unit: psm.unit,
          area: psm.area, area_unit: psm.area_unit
        }))
      );

      if (!applications.length) {
        detailsCell.innerHTML = `
          <div>
            <p>Anwendungen auf diesem Feld:</p>
            <ul>${data.map(app => `<li>${app.date} ${app.time || ''}</li>`).join('')}</ul>
          </div>
        `;
      } else {
        detailsCell.innerHTML = renderFieldApplicationsTable(applications);
      }
    })
    .catch(error => {
      toast(`❌ Fehler beim Laden der Details: ${error.message}`);
      detailsCell.innerHTML = `<div class="field-details-error">Fehler beim Laden der Details: ${escapeHtml(error.message)}</div>`;
    });
}

// Alias für Rückwärtskompatibilität
function showApplicationDetails(id) {
  showHistoryDetail(id);
}
