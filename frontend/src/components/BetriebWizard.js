import { h } from 'vue';

import { bundeslandOptions } from '../constants.js';

export default {
  name: 'BetriebWizard',
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
  methods: {
    renderField(label, inputId, field, attrs = {}) {
      return h('div', { class: 'field' }, [
        h('label', { for: inputId }, label),
        h('input', {
          id: inputId,
          value: this.form[field],
          onInput: event => this.$emit('update-field', field, event.target.value),
          ...attrs,
        }),
      ]);
    },
  },
  render() {
    const localSave = this.form.localSave;

    return h('div', { class: 'modal' }, [
      h('h3', 'Willkommen 👋'),
      h('p', { class: 'modal-note' }, 'Bevor du loslegst, trage bitte einmal die Betriebsdaten ein.'),
      h('div', { class: 'form-grid cols-3' }, [
        this.renderField('Firma', 'wiz-firma', 'firma', { placeholder: 'Mustermann Gemüsebau' }),
        this.renderField('Nachname', 'wiz-name', 'name', { placeholder: 'Mustermann' }),
        this.renderField('Vorname', 'wiz-vorname', 'vorname', { placeholder: 'Max' }),
        this.renderField('Straße + Hausnr.', 'wiz-strHnr', 'strHnr', { placeholder: 'Musterstraße 123' }),
        this.renderField('PLZ', 'wiz-plz', 'plz', { placeholder: '12345' }),
        this.renderField('Ort', 'wiz-ort', 'ort', { placeholder: 'Musterstadt' }),
        h('div', { class: 'field' }, [
          h('label', { for: 'wiz-bundesland' }, 'Bundesland'),
          h('select', {
            id: 'wiz-bundesland',
            value: this.form.bundesland,
            onChange: event => this.$emit('update-field', 'bundesland', event.target.value),
          }, bundeslandOptions.map(([value, label]) => h('option', { value }, label))),
        ]),
        this.renderField(
          'Anwendungsverantwortlicher',
          'wiz-anwendungsverantwortlicher',
          'verantwortlicher',
          { placeholder: 'Max Mustermann' },
        ),
        this.renderField('Anwender', 'wiz-anwender', 'anwender', { placeholder: 'Max Mustermann' }),
      ]),
      h('div', { class: 'wizard-settings-box' }, [
        h('div', { class: 'wizard-settings-title' }, '📁 Speicher-Einstellung'),
        h('div', { class: 'settings-row' }, [
          h('span', {
            class: ['upper-label', localSave ? 'label-muted' : 'label-inherit'],
            id: 'wiz-lbl-browser',
          }, 'Browser-Download'),
          h('label', {
            class: 'save-toggle',
            title: 'Umschalten zwischen Browser-Download und lokalem Speichern',
          }, [
            h('input', {
              type: 'checkbox',
              id: 'wiz-save-mode-toggle',
              checked: localSave,
              onChange: event => this.$emit('update-field', 'localSave', event.target.checked),
            }),
            h('span', { class: 'save-toggle-track' }),
          ]),
          h('span', {
            class: ['upper-label', localSave ? 'label-inherit' : 'label-muted'],
            id: 'wiz-lbl-local',
          }, 'Lokal speichern'),
        ]),
        h('div', {
          class: 'text-muted-sm mt-05',
          id: 'wiz-save-mode-desc',
        }, localSave
          ? 'Datei wird auf dem Server im Exportordner abgelegt'
          : 'Datei wird als ZIP (JSON + PDF) direkt im Browser heruntergeladen'),
      ]),
      h('div', { class: 'modal-footer' }, [
        h('button', {
          type: 'button',
          class: 'btn btn-primary',
          disabled: this.isSaving,
          onClick: () => this.$emit('save'),
        }, this.isSaving ? 'Speichert...' : 'Speichern und starten'),
      ]),
    ]);
  },
};
