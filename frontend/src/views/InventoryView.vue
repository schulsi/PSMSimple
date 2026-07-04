<template>
  <h2>📦 Lagerbestand</h2>

  <div class="sub-tabs">
    <button
      type="button"
      class="sub-tab-btn"
      :class="{ active: activeSubTab === 'overview' }"
      @click="showSubTab('overview')"
    >
      📊 Übersicht
    </button>
    <button
      type="button"
      class="sub-tab-btn"
      :class="{ active: activeSubTab === 'movements' }"
      @click="showSubTab('movements')"
    >
      📋 Bewegungshistorie
    </button>
  </div>

  <div id="inventory-sub-overview" class="history-sub-tab" :class="{ active: activeSubTab === 'overview' }">
    <div id="inventory-list" class="item-list">
      <div v-if="isOverviewLoading" class="empty">Lagerbestand wird geladen...</div>
      <div v-else-if="!items.length" class="empty">Noch keine Pflanzenschutzmittel angelegt.</div>
      <div
        v-for="item in items"
        v-else
        :key="item.psm_id"
        class="item inventory-item"
        :data-status="item.status"
      >
        <div class="item-info">
          <div class="name">{{ item.name }}</div>
          <div class="inventory-bestand">
            <span class="bestand-zahl">{{ item.bestand }}</span>
            <span class="bestand-einheit">{{ item.einheit || '—' }}</span>
          </div>
          <div v-if="item.status !== 'ok'" class="inventory-thresholds">
            <span v-if="item.min_lager" class="threshold min">Min: {{ item.min_lager }} {{ item.einheit }}</span>
            <span v-if="item.warnung_lager" class="threshold warn">Warnung: {{ item.warnung_lager }} {{ item.einheit }}</span>
          </div>
        </div>
        <div class="item-actions">
          <span class="badge-status" :class="statusInfo(item.status).cls">{{ statusInfo(item.status).text }}</span>
          <button
            v-if="canWrite"
            type="button"
            class="btn btn-sm btn-ghost"
            @click="openMovementModal(item)"
          >
            + Buchung
          </button>
        </div>
      </div>
    </div>
  </div>

  <div id="inventory-sub-movements" class="history-sub-tab" :class="{ active: activeSubTab === 'movements' }">
    <div class="card mb-085">
      <div class="form-grid filter-grid">
        <div class="field">
          <label>Anzahl Einträge</label>
          <select id="inventory-movements-limit" v-model.number="movementLimit" @change="loadMovements">
            <option :value="50">50</option>
            <option :value="200">200</option>
            <option :value="500">500</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card">
      <div id="inventory-movements-list">
        <div v-if="isMovementsLoading" class="empty">Bewegungshistorie wird geladen...</div>
        <div v-else-if="!movements.length" class="empty">Keine Lagerbewegungen vorhanden.</div>
        <table v-else class="table movements-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Mittel</th>
              <th>Typ</th>
              <th>Menge</th>
              <th>Notiz</th>
              <th>Quelle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in movements" :key="row.id">
              <td>{{ row.datum || '—' }}</td>
              <td>{{ row.psm_name || '—' }}</td>
              <td>
                <span class="movement-type" :class="`movement-type-${row.typ}`">
                  {{ movementTypeLabel(row.typ) }}
                </span>
              </td>
              <td class="text-right">{{ row.menge }} {{ row.einheit || '' }}</td>
              <td class="text-muted">{{ row.notiz || '-' }}</td>
              <td class="text-muted">{{ row.quelle || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <Teleport to="#modal-inventory">
    <div class="modal">
      <h3 id="modal-inventory-title">Buchung: {{ movementModal.psmName || 'Lagerbuchung' }}</h3>
      <input id="inv-psm-id" type="hidden" :value="movementForm.psm_id" />

      <div class="form-grid">
        <div class="field">
          <label>Buchungstyp</label>
          <select id="inv-typ" v-model="movementForm.typ">
            <option value="purchase">Einkauf (Zugang)</option>
            <option value="correction_plus">Korrektur + (Zugang)</option>
            <option value="correction_minus">Korrektur − (Abgang)</option>
            <option value="disposal">Entsorgung (Abgang)</option>
          </select>
        </div>

        <div class="field">
          <label>Menge (<span id="inv-einheit-label">{{ movementModal.einheit || '—' }}</span>)</label>
          <input id="inv-menge" v-model="movementForm.menge" type="number" step="0.001" min="0" placeholder="0.000" />
        </div>

        <div class="field">
          <label>Datum</label>
          <input id="inv-datum" v-model="movementForm.datum" type="date" />
        </div>

        <div class="field span-2">
          <label>Notiz (optional)</label>
          <input id="inv-notiz" v-model="movementForm.notiz" placeholder="z.B. Lieferschein-Nr. oder Grund" />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" @click="closeMovementModal">Abbrechen</button>
        <button type="button" class="btn btn-primary" :disabled="isSavingMovement" @click="saveMovement">
          {{ isSavingMovement ? 'Bucht...' : 'Buchen' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { onMounted, reactive, ref, watch } from 'vue';

import { toast } from '../app/appBridge.js';
import { apiGet, apiPost } from '../app/api.js';

const statusLabels = {
  ok: { text: 'OK', cls: 'badge-ok' },
  warning: { text: 'Warnung', cls: 'badge-warning' },
  critical: { text: 'Kritisch', cls: 'badge-critical' },
  negative: { text: 'Negativ', cls: 'badge-negative' },
};

const movementTypeLabels = {
  purchase: 'Einkauf',
  application: 'Ausbringung',
  correction_plus: 'Korrektur +',
  correction_minus: 'Korrektur -',
  disposal: 'Entsorgung',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default {
  name: 'InventoryView',
  props: {
    canWrite: {
      type: Boolean,
      default: false,
    },
    activeTab: {
      type: String,
      default: '',
    },
    refreshKey: {
      type: Number,
      default: 0,
    },
  },
  emits: ['warning-count'],
  setup(props, { emit }) {
    const activeSubTab = ref('overview');
    const items = ref([]);
    const movements = ref([]);
    const movementLimit = ref(200);
    const isOverviewLoading = ref(false);
    const isMovementsLoading = ref(false);
    const isSavingMovement = ref(false);
    const movementModal = reactive({
      psmName: '',
      einheit: '',
    });
    const movementForm = reactive({
      psm_id: '',
      typ: 'purchase',
      menge: '',
      datum: todayIso(),
      notiz: '',
    });

    async function loadInventory() {
      isOverviewLoading.value = true;
      try {
        const data = await apiGet('/api/inventory');
        const list = Array.isArray(data) ? data : [];
        items.value = list;
        emit('warning-count', list.filter(item => item.status !== 'ok').length);
      } catch (error) {
        console.error(error);
        toast('❌ Lagerbestand konnte nicht geladen werden');
      } finally {
        isOverviewLoading.value = false;
      }
    }

    async function loadMovements() {
      isMovementsLoading.value = true;
      try {
        const data = await apiGet(`/api/inventory/movements?limit=${movementLimit.value}`);
        movements.value = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(error);
        toast('❌ Bewegungshistorie konnte nicht geladen werden');
      } finally {
        isMovementsLoading.value = false;
      }
    }

    function showSubTab(subtab) {
      activeSubTab.value = subtab;
      if (subtab === 'movements') {
        loadMovements();
      } else {
        loadInventory();
      }
    }

    function statusInfo(status) {
      return statusLabels[status] || statusLabels.ok;
    }

    function movementTypeLabel(type) {
      return movementTypeLabels[type] || type;
    }

    function resetMovementForm() {
      Object.assign(movementForm, {
        psm_id: '',
        typ: 'purchase',
        menge: '',
        datum: todayIso(),
        notiz: '',
      });
      movementModal.psmName = '';
      movementModal.einheit = '';
    }

    function openMovementModal(item) {
      movementForm.psm_id = item.psm_id;
      movementForm.datum = movementForm.datum || todayIso();
      movementModal.psmName = item.name || '';
      movementModal.einheit = item.einheit || '';
      document.getElementById('modal-inventory')?.classList.add('open');
    }

    function closeMovementModal() {
      document.getElementById('modal-inventory')?.classList.remove('open');
    }

    async function saveMovement() {
      const psmId = Number.parseInt(movementForm.psm_id, 10);
      const menge = Number.parseFloat(movementForm.menge);
      const datum = String(movementForm.datum || '').trim();
      const typ = String(movementForm.typ || '').trim();

      if (!psmId || !typ || Number.isNaN(menge) || menge < 0 || !datum) {
        toast('❌ Bitte alle Pflichtfelder ausfüllen');
        return;
      }

      isSavingMovement.value = true;
      try {
        await apiPost('/api/inventory/movements', {
          psm_id: psmId,
          typ,
          menge,
          datum,
          notiz: String(movementForm.notiz || '').trim() || null,
        });
        toast('✅ Buchung gespeichert');
        closeMovementModal();
        resetMovementForm();
        await loadInventory();
        if (activeSubTab.value === 'movements') await loadMovements();
      } catch (error) {
        console.error(error);
        toast(`❌ ${error.message}`);
      } finally {
        isSavingMovement.value = false;
      }
    }

    onMounted(() => {
      loadInventory();
    });

    watch(() => props.activeTab, (tabName) => {
      if (tabName !== 'inventory') return;
      if (activeSubTab.value === 'movements') {
        loadMovements();
      } else {
        loadInventory();
      }
    });

    watch(() => props.refreshKey, () => {
      if (props.activeTab !== 'inventory') return;
      if (activeSubTab.value === 'movements') {
        loadMovements();
      } else {
        loadInventory();
      }
    });

    return {
      activeSubTab,
      closeMovementModal,
      isMovementsLoading,
      isOverviewLoading,
      isSavingMovement,
      items,
      loadMovements,
      movementForm,
      movementLimit,
      movementModal,
      movementTypeLabel,
      movements,
      openMovementModal,
      saveMovement,
      showSubTab,
      statusInfo,
    };
  },
};
</script>
