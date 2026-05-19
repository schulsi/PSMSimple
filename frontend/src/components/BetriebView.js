import { h } from 'vue';

import { bundeslandOptions } from '../constants.js';

export default {
  name: 'BetriebView',
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
    return [
      h('h2', [
        '🏡 Betrieb ',
        h('span', { class: 'badge' }, 'Stammdaten'),
      ]),
      h('div', { class: 'card' }, [
        h('div', { class: 'form-grid cols-3' }, [
          this.renderField('Firma', 'b-firma', 'firma'),
          this.renderField('Nachname', 'b-name', 'name'),
          this.renderField('Vorname', 'b-vorname', 'vorname'),
          this.renderField('Straße + Hausnr.', 'b-strHnr', 'strHnr'),
          this.renderField('PLZ', 'b-plz', 'plz'),
          this.renderField('Ort', 'b-ort', 'ort'),
          h('div', { class: 'field' }, [
            h('label', { for: 'b-bundesland' }, 'Bundesland'),
            h('select', {
              id: 'b-bundesland',
              value: this.form.bundesland,
              onChange: event => this.$emit('update-field', 'bundesland', event.target.value),
            }, bundeslandOptions.map(([value, label]) => h('option', { value }, label))),
          ]),
        ]),
        h('div', { class: 'mt-1 flex-end' }, [
          h('button', {
            type: 'button',
            class: 'btn btn-primary',
            disabled: this.isSaving,
            onClick: () => this.$emit('save'),
          }, this.isSaving ? 'Speichert...' : '💾 Speichern'),
        ]),
      ]),
    ];
  },
};
