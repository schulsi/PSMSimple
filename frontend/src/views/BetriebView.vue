<template>
  <h2>
    🏡 Betrieb <span class="badge">Stammdaten</span>
  </h2>

  <Card class="card">
    <template #content>
      <div class="form-grid cols-3">
        <div v-for="field in textFields" :key="field.key" class="field">
          <label :for="field.id">{{ field.label }}</label>
          <InputText
            :id="field.id"
            :model-value="form[field.key]"
            @update:model-value="$emit('update-field', field.key, $event)"
          />
        </div>

        <div class="field">
          <label for="b-bundesland">Bundesland</label>
          <select
            id="b-bundesland"
            :value="form.bundesland"
            @change="$emit('update-field', 'bundesland', $event.target.value)"
          >
            <option
              v-for="option in bundeslandSelectOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="mt-1 flex-end">
        <Button
          type="button"
          class="btn btn-primary"
          :disabled="isSaving"
          :label="isSaving ? 'Speichert...' : '💾 Speichern'"
          @click="$emit('save')"
        />
      </div>
    </template>
  </Card>
</template>

<script>
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';

import { bundeslandOptions } from '../constants.js';

export default {
  name: 'BetriebView',
  components: {
    Button,
    Card,
    InputText,
  },
  props: {
    form: {
      type: Object,
      required: true,
    },
    isSaving: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update-field', 'save'],
  data() {
    return {
      textFields: [
        { label: 'Firma', id: 'b-firma', key: 'firma' },
        { label: 'Nachname', id: 'b-name', key: 'name' },
        { label: 'Vorname', id: 'b-vorname', key: 'vorname' },
        { label: 'Straße + Hausnr.', id: 'b-strHnr', key: 'strHnr' },
        { label: 'PLZ', id: 'b-plz', key: 'plz' },
        { label: 'Ort', id: 'b-ort', key: 'ort' },
      ],
    };
  },
  computed: {
    bundeslandSelectOptions() {
      return bundeslandOptions.map(([value, label]) => ({ value, label }));
    },
  },
};
</script>
