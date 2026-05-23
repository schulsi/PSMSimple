<template>
  <div class="modal">
    <h3>Willkommen 👋</h3>
    <p class="modal-note">Bevor du loslegst, trage bitte einmal die Betriebsdaten ein.</p>

    <div class="form-grid cols-3">
      <div v-for="field in textFields" :key="field.key" class="field">
        <label :for="field.id">{{ field.label }}</label>
        <InputText
          :id="field.id"
          :model-value="form[field.key]"
          :placeholder="field.placeholder"
          @update:model-value="$emit('update-field', field.key, $event)"
        />
      </div>

      <div class="field">
        <label for="wiz-bundesland">Bundesland</label>
        <Select
          input-id="wiz-bundesland"
          :model-value="form.bundesland"
          :options="bundeslandSelectOptions"
          option-label="label"
          option-value="value"
          @update:model-value="$emit('update-field', 'bundesland', $event)"
        />
      </div>
    </div>

    <div class="wizard-settings-box">
      <div class="wizard-settings-title">📁 Speicher-Einstellung</div>
      <div class="settings-row">
        <span id="wiz-lbl-browser" class="upper-label" :class="localSave ? 'label-muted' : 'label-inherit'">
          Browser-Download
        </span>
        <label class="save-toggle" title="Umschalten zwischen Browser-Download und lokalem Speichern">
          <input
            id="wiz-save-mode-toggle"
            type="checkbox"
            :checked="localSave"
            @change="$emit('update-field', 'localSave', $event.target.checked)"
          >
          <span class="save-toggle-track"></span>
        </label>
        <span id="wiz-lbl-local" class="upper-label" :class="localSave ? 'label-inherit' : 'label-muted'">
          Lokal speichern
        </span>
      </div>
      <div id="wiz-save-mode-desc" class="text-muted-sm mt-05">
        {{ localSave
          ? 'Datei wird auf dem Server im Exportordner abgelegt'
          : 'Datei wird als ZIP (JSON + PDF) direkt im Browser heruntergeladen' }}
      </div>
    </div>

    <div class="modal-footer">
      <Button
        type="button"
        class="btn btn-primary"
        :disabled="isSaving"
        :label="isSaving ? 'Speichert...' : 'Speichern und starten'"
        @click="$emit('save')"
      />
    </div>
  </div>
</template>

<script>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import { bundeslandOptions } from '../constants.js';

export default {
  name: 'BetriebWizard',
  components: {
    Button,
    InputText,
    Select,
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
        { label: 'Firma', id: 'wiz-firma', key: 'firma', placeholder: 'Mustermann Gemüsebau' },
        { label: 'Nachname', id: 'wiz-name', key: 'name', placeholder: 'Mustermann' },
        { label: 'Vorname', id: 'wiz-vorname', key: 'vorname', placeholder: 'Max' },
        { label: 'Straße + Hausnr.', id: 'wiz-strHnr', key: 'strHnr', placeholder: 'Musterstraße 123' },
        { label: 'PLZ', id: 'wiz-plz', key: 'plz', placeholder: '12345' },
        { label: 'Ort', id: 'wiz-ort', key: 'ort', placeholder: 'Musterstadt' },
        { label: 'Anwendungsverantwortlicher', id: 'wiz-anwendungsverantwortlicher', key: 'verantwortlicher', placeholder: 'Max Mustermann' },
        { label: 'Anwender', id: 'wiz-anwender', key: 'anwender', placeholder: 'Max Mustermann' },
      ],
    };
  },
  computed: {
    localSave() {
      return !!this.form.localSave;
    },
    bundeslandSelectOptions() {
      return bundeslandOptions.map(([value, label]) => ({ value, label }));
    },
  },
};
</script>
