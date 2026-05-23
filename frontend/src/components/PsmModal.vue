<template>
  <div class="modal">
    <h3 id="modal-psm-title">
      {{ isEditing ? 'Pflanzenschutzmittel bearbeiten' : 'Pflanzenschutzmittel hinzufügen' }}
    </h3>

    <div class="form-grid">
      <div class="field">
        <label for="psm-name">Name</label>
        <div class="autocomplete-wrap">
          <InputText
            id="psm-name"
            autocomplete="off"
            :disabled="isInfoLoading"
            :model-value="form.name"
            @update:model-value="onNameInput"
          />
          <div id="psm-search-results" class="autocomplete-results" :class="{ show: showSearchResults }">
            <template v-if="showSearchResults">
              <div v-if="!searchResults.length" class="autocomplete-empty">Keine Treffer</div>
              <button
                v-for="item in searchResults"
                v-else
                :key="`${item.kennr}-${item.name}`"
                type="button"
                class="autocomplete-item"
                @click="$emit('select-search-result', item)"
              >
                {{ item.name }} <span class="text-muted">({{ item.kennr || '' }})</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <div v-for="field in topFields" :key="field.key" class="field">
        <label :for="field.id">{{ field.label }}</label>
        <InputText
          :id="field.id"
          :disabled="field.disabled"
          :model-value="form[field.key]"
          @update:model-value="$emit('update-field', field.key, $event)"
        />
      </div>

      <div class="field">
        <label for="psm-aufwandEinheit">Einheit (Aufwandsmenge)</label>
        <InputText
          id="psm-aufwandEinheit"
          name="einheit"
          list="einheiten"
          :model-value="form.aufwandEinheit"
          @update:model-value="$emit('update-field', 'aufwandEinheit', $event)"
        />
        <datalist id="einheiten">
          <option value="kg/ha"></option>
          <option value="l/ha"></option>
          <option value="g/ha"></option>
          <option value="ml/ha"></option>
        </datalist>
      </div>

      <div class="field span-2">
        <label for="psm-bienen">Bienengefährlichkeit</label>
        <Select
          input-id="psm-bienen"
          class="small-select"
          :model-value="form.bienen"
          :options="beeSelectOptions"
          option-label="label"
          option-value="value"
          @update:model-value="$emit('update-field', 'bienen', $event)"
        />
      </div>

      <div v-for="field in inventoryFields" :key="field.key" class="field">
        <label :for="field.id">{{ field.label }}</label>
        <InputText
          :id="field.id"
          :model-value="form[field.key]"
          :step="field.step"
          :type="field.type || 'text'"
          @update:model-value="$emit('update-field', field.key, $event)"
        />
      </div>
    </div>

    <div class="modal-footer">
      <Button type="button" class="btn btn-ghost p-button-secondary" label="Abbrechen" @click="$emit('cancel')" />
      <Button
        id="psm-save-btn"
        type="button"
        class="btn btn-primary"
        :disabled="isInfoLoading"
        :label="isInfoLoading ? 'Lade Daten ...' : 'Speichern'"
        @click="$emit('save')"
      />
    </div>
  </div>
</template>

<script>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

const beeOptions = [
  ['B1', '(B1) Bienengefährlich'],
  ['B2', '(B2) Bienengefährlich außer nach dem täglichen Bienenflug'],
  ['B3', '(B3) Bienengefährlich, Anwendungsverbot'],
  ['B4', '(B4) Nicht bienengefährlich'],
];

export default {
  name: 'PsmModal',
  components: {
    Button,
    InputText,
    Select,
  },
  props: {
    form: { type: Object, required: true },
    isEditing: { type: Boolean, default: false },
    isInfoLoading: { type: Boolean, default: false },
    searchResults: { type: Array, default: () => [] },
    showSearchResults: { type: Boolean, default: false },
  },
  emits: ['cancel', 'save', 'search', 'select-search-result', 'update-field'],
  data() {
    return {
      topFields: [
        { label: 'Zulassungsnr.', id: 'psm-zulassungsnr', key: 'zulassungsnr', disabled: true },
        { label: 'Wirkstoffe', id: 'psm-wirkstoffe', key: 'wirkstoffe', disabled: true },
      ],
      inventoryFields: [
        { label: 'Lagereinheit', id: 'psm-lager_einheit', key: 'lager_einheit' },
        { label: 'Mindestbestand', id: 'psm-min_lager', key: 'min_lager', type: 'number', step: '0.01' },
        { label: 'Warnbestand', id: 'psm-warnung_lager', key: 'warnung_lager', type: 'number', step: '0.01' },
      ],
    };
  },
  computed: {
    beeSelectOptions() {
      return beeOptions.map(([value, label]) => ({ value, label }));
    },
  },
  methods: {
    onNameInput(value) {
      this.$emit('update-field', 'name', value);
      this.$emit('search', value);
    },
  },
};
</script>
