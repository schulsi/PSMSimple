<template>
  <h2>🕘 Verlauf <span id="history-count" class="badge">{{ activeCount }}</span></h2>

  <div class="sub-tabs">
    <button
      type="button"
      class="sub-tab-btn"
      :class="{ active: activeSubTab === 'applications' }"
      @click="showSubTab('applications')"
    >
      📄 Applikationen
    </button>
    <button
      type="button"
      class="sub-tab-btn"
      :class="{ active: activeSubTab === 'psm-usage' }"
      @click="showSubTab('psm-usage')"
    >
      🧪 PSM-Verwendung
    </button>
    <button
      type="button"
      class="sub-tab-btn"
      :class="{ active: activeSubTab === 'fields-usage' }"
      @click="showSubTab('fields-usage')"
    >
      📍 Felder-Verwendung
    </button>
  </div>

  <div id="history-sub-applications" class="history-sub-tab" :class="{ active: activeSubTab === 'applications' }">
    <HistoryFilter
      prefix="history"
      :date-from="filters.applications.dateFrom"
      :date-to="filters.applications.dateTo"
      @quick="range => quickSelect('applications', range)"
      @reset="resetFilter('applications')"
      @update:date-from="value => updateFilter('applications', 'dateFrom', value)"
      @update:date-to="value => updateFilter('applications', 'dateTo', value)"
    />

    <div class="card">
      <p class="text-muted-history">Hier siehst du alle gespeicherten Applikationen.</p>
      <div id="history-list" class="item-list">
        <div v-if="isHistoryLoading" class="empty">Applikationen werden geladen...</div>
        <div v-else-if="!historyItems.length" class="empty">Noch keine Applikationen gespeichert.</div>
        <div v-for="item in historyItems" v-else :key="item.id" class="item">
          <div class="item-info">
            <div class="name">
              {{ item.datum || 'Ohne Datum' }}<template v-if="item.uhrzeit"> · {{ item.uhrzeit }}</template>
            </div>
            <div class="meta">{{ item.artVerwendung || '—' }}</div>
            <div class="meta"><strong>Einsatzorte:</strong> {{ item.einsatzorte || '—' }}</div>
            <div class="meta"><strong>PSM:</strong> {{ item.psm_namen || '—' }}</div>
            <div class="meta"><strong>Kulturen:</strong> {{ item.kulturen || '—' }}</div>
          </div>
          <div class="item-actions">
            <button type="button" class="btn btn-sm btn-ghost" @click="showHistoryDetail(item.id)">Details</button>
            <button v-if="canWrite" type="button" class="btn btn-sm btn-danger" @click="deleteHistoryEntry(item.id)">Löschen</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="history-sub-psm-usage" class="history-sub-tab" :class="{ active: activeSubTab === 'psm-usage' }">
    <HistoryFilter
      prefix="psm-history"
      :date-from="filters.psm.dateFrom"
      :date-to="filters.psm.dateTo"
      @quick="range => quickSelect('psm', range)"
      @reset="resetFilter('psm')"
      @update:date-from="value => updateFilter('psm', 'dateFrom', value)"
      @update:date-to="value => updateFilter('psm', 'dateTo', value)"
    />

    <div class="card">
      <p class="text-muted-history">Übersicht über die Verwendung von Pflanzenschutzmitteln.</p>
      <div class="history-chart-wrap">
        <canvas id="psm-usage-chart" ref="psmChartCanvas" class="chart-canvas"></canvas>
      </div>
      <div id="psm-usage-list">
        <div v-if="isPsmLoading" class="empty">PSM-Verwendung wird geladen...</div>
        <div v-else-if="!psmItems.length" class="empty">Keine PSM-Verwendungen im ausgewählten Zeitraum.</div>
        <table v-else class="psm-usage-table">
          <thead>
            <tr>
              <th>Pflanzenschutzmittel</th>
              <th>Verwendungen</th>
              <th>Gesamtmenge</th>
              <th>Zuletzt verwendet</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in psmItems" :key="item.psm_name">
              <td>{{ item.psm_name }}</td>
              <td>{{ item.usage_count }}</td>
              <td>{{ formatQuantity(item.total_quantity, item.unit) }}</td>
              <td>{{ item.last_used || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="history-sub-fields-usage" class="history-sub-tab" :class="{ active: activeSubTab === 'fields-usage' }">
    <HistoryFilter
      prefix="fields-history"
      :date-from="filters.fields.dateFrom"
      :date-to="filters.fields.dateTo"
      @quick="range => quickSelect('fields', range)"
      @reset="resetFilter('fields')"
      @update:date-from="value => updateFilter('fields', 'dateFrom', value)"
      @update:date-to="value => updateFilter('fields', 'dateTo', value)"
    />

    <div class="card">
      <p class="text-muted-history">Übersicht über die Verwendung von Einsatzorten (Feldern).</p>
      <div class="history-chart-wrap">
        <canvas id="fields-usage-chart" ref="fieldsChartCanvas" class="chart-canvas"></canvas>
      </div>
      <div id="fields-usage-list">
        <div v-if="isFieldsLoading" class="empty">Felder-Verwendung wird geladen...</div>
        <div v-else-if="!fieldItems.length" class="empty">Keine Feld-Verwendungen im ausgewählten Zeitraum.</div>
        <table v-else class="psm-usage-table">
          <thead>
            <tr>
              <th>Einsatzort (Feld)</th>
              <th>Verwendungen</th>
              <th>Zuletzt verwendet</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in fieldItems" :key="item.field_name">
              <tr>
                <td>{{ item.field_name }}</td>
                <td>{{ item.usage_count }}</td>
                <td>{{ item.last_used || '—' }}</td>
                <td>
                  <button type="button" class="btn btn-sm btn-ghost" @click="toggleFieldDetails(item.field_name)">
                    {{ expandedField === item.field_name ? '🔼' : '🔽' }}
                  </button>
                </td>
              </tr>
              <tr v-if="expandedField === item.field_name" class="field-details-row">
                <td colspan="4" class="field-details-cell">
                  <div v-if="fieldDetailsLoading" class="field-details-loading">Lade Details...</div>
                  <div v-else-if="fieldDetailsError" class="field-details-error">{{ fieldDetailsError }}</div>
                  <div v-else-if="!fieldDetailApplications.length" class="field-details-empty">Keine Anwendungen gefunden</div>
                  <table v-else class="field-applications-table">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Uhrzeit</th>
                        <th>PSM</th>
                        <th>Menge</th>
                        <th>Fläche</th>
                        <th>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="application in fieldDetailApplications" :key="`${application.id}-${application.psm_name}`">
                        <td>{{ application.date }}</td>
                        <td>{{ application.time || '—' }}</td>
                        <td>{{ application.psm_name }}</td>
                        <td>{{ application.quantity ? `${application.quantity} ${application.unit || ''}`.trim() : '—' }}</td>
                        <td>{{ application.area ? `${application.area} ${application.area_unit || ''}`.trim() : '—' }}</td>
                        <td><button type="button" class="link-button" @click="showHistoryDetail(application.id)">Anzeigen</button></td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="history-detail-wrap" class="card" :class="{ hidden: !detailItem, visible: !!detailItem }">
    <h3 class="section-title">🔍 Applikationsdetails</h3>
    <div v-if="detailItem" id="history-detail" ref="detailWrap" class="history-detail">
      <HistoryDetail :item="detailItem" />
    </div>
  </div>
</template>

<script>
import { computed, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { apiDelete, apiGet } from '../app/api.js';

const palette = [
  '#2d6a4f',
  '#40916c',
  '#52b788',
  '#74c69d',
  '#95d5b2',
  '#1b4332',
  '#3a5a40',
  '#588157',
];

const HistoryFilter = {
  name: 'HistoryFilter',
  props: {
    dateFrom: { type: String, required: true },
    dateTo: { type: String, required: true },
    prefix: { type: String, required: true },
  },
  emits: ['quick', 'reset', 'update:date-from', 'update:date-to'],
  render() {
    return h('div', { class: 'card mb-085' }, [
      h('div', { class: 'form-grid history-filter-row filter-grid' }, [
        h('div', { class: 'field' }, [
          h('label', 'Von'),
          h('input', {
            id: `${this.prefix}-date-from`,
            type: 'date',
            value: this.dateFrom,
            onChange: event => this.$emit('update:date-from', event.target.value),
          }),
        ]),
        h('div', { class: 'field' }, [
          h('label', 'Bis'),
          h('input', {
            id: `${this.prefix}-date-to`,
            type: 'date',
            value: this.dateTo,
            onChange: event => this.$emit('update:date-to', event.target.value),
          }),
        ]),
        h('div', { class: 'flex-center gap-05' }, [
          h('button', {
            type: 'button',
            class: 'btn btn-sm btn-ghost',
            onClick: () => this.$emit('reset'),
          }, 'Zurücksetzen'),
        ]),
      ]),
      h('div', { class: 'history-quick-select quick-select-row' }, [
        ['thisMonth', 'Dieser Monat'],
        ['lastMonth', 'Letzter Monat'],
        ['thisYear', 'Dieses Jahr'],
        ['lastYear', 'Letztes Jahr'],
      ].map(([range, label]) => h('button', {
        type: 'button',
        class: 'btn btn-sm btn-outline',
        onClick: () => this.$emit('quick', range),
      }, label))),
    ]);
  },
};

const HistoryDetail = {
  name: 'HistoryDetail',
  props: {
    item: { type: Object, required: true },
  },
  methods: {
    field(label, value) {
      return h('div', { class: 'history-field' }, [
        h('div', { class: 'label' }, label),
        h('div', { class: 'value' }, value || '—'),
      ]);
    },
    listBlock(items, emptyText, renderItem) {
      if (!items?.length) return h('div', { class: 'empty-text empty' }, emptyText);
      return h('div', { class: 'history-list-block' }, items.map(renderItem));
    },
  },
  render() {
    const data = this.item.json_data || {};
    const anwendung = data.anwendung || {};
    const betrieb = data.betrieb || {};
    const psm = data.pflanzenschutzmittel || [];
    const einsatzorte = data.einsatzorte || [];
    const kulturen = data.kulturen || [];

    return h('div', [
      h('div', { class: 'history-section' }, [
        h('h4', 'Anwendung'),
        h('div', { class: 'history-grid' }, [
          this.field('Datum', anwendung.datum),
          this.field('Uhrzeit', anwendung.uhrzeit),
          this.field('Art der Verwendung', anwendung.artVerwendung),
          this.field('Verantwortlich', anwendung.verantwortlich),
          this.field('Anwender', anwendung.anwender),
          this.field('Gespeichert am', formatDateTime(this.item.created_at)),
        ]),
      ]),
      h('div', { class: 'history-section' }, [
        h('h4', 'Betrieb'),
        h('div', { class: 'history-grid' }, [
          this.field('Firma', betrieb.firma),
          this.field('Nachname', betrieb.name),
          this.field('Vorname', betrieb.vorname),
          this.field('Straße / Hausnr.', betrieb.strHnr),
          this.field('PLZ', betrieb.plz),
          this.field('Ort', betrieb.ort),
          this.field('Bundesland', betrieb.bundesland),
        ]),
      ]),
      h('div', { class: 'history-section' }, [
        h('h4', 'Kulturen & BBCH'),
        this.listBlock(kulturen, 'Keine Kulturen hinterlegt.', kultur => h('div', { class: 'history-subitem' }, [
          h('div', { class: 'history-subitem-title' }, kultur.name || 'Unbenannte Kultur'),
          h('div', { class: 'history-subitem-meta' }, [h('strong', 'BBCH-Stadium:'), ` ${kultur.bbchCode || '—'}`]),
        ])),
      ]),
      h('div', { class: 'history-section' }, [
        h('h4', 'Einsatzorte'),
        this.listBlock(einsatzorte, 'Keine Einsatzorte vorhanden.', ort => h('div', { class: 'history-subitem' }, [
          h('div', { class: 'history-subitem-title' }, ort.name || 'Unbenannter Einsatzort'),
          h('div', { class: 'history-subitem-meta' }, `Bereich: ${ort.anwendungsbereich || '—'}`),
          h('div', { class: 'history-subitem-meta' }, `Fläche: ${ort.flaecheVolumen || '—'} ${ort.einheit || ''}`),
        ])),
      ]),
      h('div', { class: 'history-section' }, [
        h('h4', 'Pflanzenschutzmittel'),
        this.listBlock(psm, 'Keine Pflanzenschutzmittel vorhanden.', item => {
          const menge = item.aufwandMenge || '';
          const einheit = item.aufwandEinheit || '';
          return h('div', { class: 'history-subitem' }, [
            h('div', { class: 'history-subitem-title' }, item.name || 'Unbenanntes Mittel'),
            h('div', { class: 'history-subitem-meta' }, [h('strong', 'Verwendete Menge:'), ` ${menge ? `${menge} ${einheit}`.trim() : '—'}`]),
          ]);
        }),
      ]),
    ]);
  },
};

function formatDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const today = new Date();
  const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  return {
    dateFrom: formatDateInputValue(lastYear),
    dateTo: formatDateInputValue(today),
  };
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE');
}

function chartPalette(count) {
  return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
}

function buildDateUrl(apiPath, filter) {
  const params = new URLSearchParams();
  if (filter.dateFrom) params.set('date_from', filter.dateFrom);
  if (filter.dateTo) params.set('date_to', filter.dateTo);
  return `${apiPath}${params.toString() ? `?${params.toString()}` : ''}`;
}

function rangeDates(range) {
  const today = new Date();
  let start;
  let end;

  switch (range) {
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case 'lastYear':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return null;
  }

  return {
    dateFrom: formatDateInputValue(start),
    dateTo: formatDateInputValue(end),
  };
}

export default {
  name: 'HistoryView',
  components: {
    HistoryDetail,
    HistoryFilter,
  },
  props: {
    activeTab: {
      type: String,
      default: '',
    },
    canWrite: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const activeSubTab = ref('applications');
    const historyItems = ref([]);
    const psmItems = ref([]);
    const fieldItems = ref([]);
    const detailItem = ref(null);
    const detailWrap = ref(null);
    const psmChartCanvas = ref(null);
    const fieldsChartCanvas = ref(null);
    const isHistoryLoading = ref(false);
    const isPsmLoading = ref(false);
    const isFieldsLoading = ref(false);
    const expandedField = ref('');
    const fieldDetailApplications = ref([]);
    const fieldDetailsLoading = ref(false);
    const fieldDetailsError = ref('');
    const filters = reactive({
      applications: defaultDateRange(),
      psm: defaultDateRange(),
      fields: defaultDateRange(),
    });
    let psmChart = null;
    let fieldsChart = null;

    const activeCount = computed(() => {
      if (activeSubTab.value === 'psm-usage') return psmItems.value.length;
      if (activeSubTab.value === 'fields-usage') return fieldItems.value.length;
      return historyItems.value.length;
    });

    async function loadHistory() {
      isHistoryLoading.value = true;
      try {
        const items = await apiGet(buildDateUrl('/api/history', filters.applications));
        historyItems.value = Array.isArray(items) ? items : [];
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isHistoryLoading.value = false;
      }
    }

    async function loadPSMUsage() {
      isPsmLoading.value = true;
      try {
        const items = await apiGet(buildDateUrl('/api/history/psm-usage', filters.psm));
        psmItems.value = Array.isArray(items) ? items : [];
        await nextTick();
        renderPSMChart();
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isPsmLoading.value = false;
      }
    }

    async function loadFieldsUsage() {
      isFieldsLoading.value = true;
      expandedField.value = '';
      try {
        const items = await apiGet(buildDateUrl('/api/history/fields-usage', filters.fields));
        fieldItems.value = Array.isArray(items) ? items : [];
        await nextTick();
        renderFieldsChart();
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isFieldsLoading.value = false;
      }
    }

    function renderPSMChart() {
      if (psmChart) psmChart.destroy();
      if (!window.Chart || !psmChartCanvas.value || !psmItems.value.length) return;

      psmChart = new window.Chart(psmChartCanvas.value.getContext('2d'), {
        type: 'pie',
        data: {
          labels: psmItems.value.map(item => item.psm_name),
          datasets: [{
            data: psmItems.value.map(item => item.usage_count),
            backgroundColor: chartPalette(psmItems.value.length),
            borderColor: '#f8f5ee',
            borderWidth: 2,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#1c2b22', usePointStyle: true, boxWidth: 10, padding: 14 },
            },
          },
        },
      });
    }

    function renderFieldsChart() {
      if (fieldsChart) fieldsChart.destroy();
      if (!window.Chart || !fieldsChartCanvas.value || !fieldItems.value.length) return;

      fieldsChart = new window.Chart(fieldsChartCanvas.value.getContext('2d'), {
        type: 'bar',
        data: {
          labels: fieldItems.value.map(item => item.field_name),
          datasets: [{
            label: 'Verwendungen',
            data: fieldItems.value.map(item => item.usage_count),
            backgroundColor: chartPalette(fieldItems.value.length),
            borderColor: '#f8f5ee',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, color: '#1c2b22' },
              title: { display: true, text: 'Verwendungen', color: '#1c2b22' },
            },
            x: { ticks: { color: '#1c2b22' } },
          },
        },
      });
    }

    function showSubTab(tabName) {
      activeSubTab.value = tabName;
      detailItem.value = null;
      if (tabName === 'psm-usage') loadPSMUsage();
      if (tabName === 'fields-usage') loadFieldsUsage();
      if (tabName === 'applications') loadHistory();
    }

    function updateFilter(name, field, value) {
      filters[name][field] = value;
      if (name === 'applications') loadHistory();
      if (name === 'psm') loadPSMUsage();
      if (name === 'fields') loadFieldsUsage();
    }

    function resetFilter(name) {
      Object.assign(filters[name], defaultDateRange());
      if (name === 'applications') loadHistory();
      if (name === 'psm') loadPSMUsage();
      if (name === 'fields') loadFieldsUsage();
    }

    function quickSelect(name, range) {
      const dates = rangeDates(range);
      if (!dates) return;
      Object.assign(filters[name], dates);
      if (name === 'applications') loadHistory();
      if (name === 'psm') loadPSMUsage();
      if (name === 'fields') loadFieldsUsage();
    }

    async function showHistoryDetail(id) {
      try {
        detailItem.value = await apiGet(`/api/history/${id}`);
        await nextTick();
        detailWrap.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      }
    }

    async function deleteHistoryEntry(id) {
      if (!confirm('Diesen History-Eintrag wirklich löschen?')) return;

      try {
        await apiDelete(`/api/history/${id}`);
        toast('✅ History-Eintrag gelöscht');
        detailItem.value = null;
        await loadHistory();
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      }
    }

    async function toggleFieldDetails(fieldName) {
      if (expandedField.value === fieldName) {
        expandedField.value = '';
        return;
      }

      expandedField.value = fieldName;
      fieldDetailsLoading.value = true;
      fieldDetailsError.value = '';
      fieldDetailApplications.value = [];

      const params = new URLSearchParams({
        field_name: fieldName,
        date_from: filters.fields.dateFrom,
        date_to: filters.fields.dateTo,
      });

      try {
        const data = await apiGet(`/api/history/field-applications?${params.toString()}`);
        const rows = Array.isArray(data) ? data : [];
        fieldDetailApplications.value = rows.flatMap(app => {
          const psmApplications = Array.isArray(app.psm_applications) ? app.psm_applications : [];
          if (!psmApplications.length) {
            return [{
              id: app.id,
              date: app.date,
              time: app.time,
              psm_name: '—',
              quantity: '',
              unit: '',
              area: '',
              area_unit: '',
            }];
          }

          return psmApplications.map(psm => ({
            id: app.id,
            date: app.date,
            time: app.time,
            psm_name: psm.name,
            quantity: psm.quantity,
            unit: psm.unit,
            area: psm.area,
            area_unit: psm.area_unit,
          }));
        });
      } catch (error) {
        console.error(error);
        fieldDetailsError.value = `Fehler beim Laden der Details: ${error.message}`;
      } finally {
        fieldDetailsLoading.value = false;
      }
    }

    function formatQuantity(quantity, unit) {
      if (quantity == null) return '—';
      return `${Number.parseFloat(quantity.toFixed(3))} ${unit || ''}`.trim();
    }

    function toast(message) {
      if (typeof window.toast === 'function') {
        window.toast(message);
      }
    }

    watch(() => props.activeTab, (tabName) => {
      if (tabName !== 'history') return;
      if (activeSubTab.value === 'applications') loadHistory();
      if (activeSubTab.value === 'psm-usage') loadPSMUsage();
      if (activeSubTab.value === 'fields-usage') loadFieldsUsage();
    });

    onMounted(() => {
      loadHistory();
    });

    onBeforeUnmount(() => {
      if (psmChart) psmChart.destroy();
      if (fieldsChart) fieldsChart.destroy();
    });

    return {
      activeCount,
      activeSubTab,
      deleteHistoryEntry,
      detailItem,
      detailWrap,
      expandedField,
      fieldDetailApplications,
      fieldDetailsError,
      fieldDetailsLoading,
      fieldItems,
      fieldsChartCanvas,
      filters,
      formatQuantity,
      historyItems,
      isFieldsLoading,
      isHistoryLoading,
      isPsmLoading,
      psmChartCanvas,
      psmItems,
      quickSelect,
      resetFilter,
      showHistoryDetail,
      showSubTab,
      toggleFieldDetails,
      updateFilter,
    };
  },
};
</script>
