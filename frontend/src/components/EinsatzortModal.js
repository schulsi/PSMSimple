import { h } from 'vue';

const anwendungsbereiche = ['Freiland', 'Gewächshaus', 'Lager'];
const geoTypen = ['GPS-Koordinaten', 'Polygon', 'Schlagname'];
const einheiten = ['m2', 'ha', 'ar'];

export default {
  name: 'EinsatzortModal',
  props: {
    form: { type: Object, required: true },
    isEditing: { type: Boolean, default: false },
    orte: { type: Array, default: () => [] },
  },
  emits: ['cancel', 'open-map', 'save', 'update-field'],
  methods: {
    renderInput(label, field, attrs = {}) {
      const { wrapperClass, ...inputAttrs } = attrs;
      return h('div', { class: wrapperClass || 'field' }, [
        h('label', label),
        h('input', {
          id: `eo-${field}`,
          value: this.form[field],
          onInput: event => this.$emit('update-field', field, event.target.value),
          ...inputAttrs,
        }),
      ]);
    },

    renderSelect(label, field, options, attrs = {}) {
      return h('div', { class: attrs.wrapperClass || 'field' }, [
        h('label', label),
        h('select', {
          id: `eo-${field}`,
          value: this.form[field],
          onChange: event => this.$emit('update-field', field, event.target.value),
        }, options.map(option => h('option', { value: option.value ?? option }, option.label ?? option))),
      ]);
    },
  },
  render() {
    return h('div', { class: 'modal' }, [
      h('h3', { id: 'modal-einsatzort-title' }, this.isEditing ? 'Einsatzort bearbeiten' : 'Einsatzort hinzufügen'),
      h('div', { class: 'form-grid' }, [
        this.renderInput('Name / Bezeichnung *', 'name', { wrapperClass: 'field span-2' }),
        h('div', { class: 'field span-2' }, [
          h('label', 'Koordinaten'),
          h('div', { class: 'map-picker-row' }, [
            h('input', {
              id: 'eo-gpsRechtswert',
              type: 'number',
              step: 'any',
              placeholder: 'Lat, z.B. 48.123456',
              value: this.form.gpsRechtswert,
              required: true,
              onInput: event => this.$emit('update-field', 'gpsRechtswert', event.target.value),
            }),
            h('input', {
              id: 'eo-gpsHochwert',
              type: 'number',
              step: 'any',
              placeholder: 'Lng, z.B. 7.654321',
              value: this.form.gpsHochwert,
              required: true,
              onInput: event => this.$emit('update-field', 'gpsHochwert', event.target.value),
            }),
            h('button', {
              type: 'button',
              class: 'btn btn-ghost btn-sm nowrap shrink-0',
              onClick: () => this.$emit('open-map'),
            }, '🗺 Karte anzeigen'),
          ]),
        ]),
        this.renderSelect('Anwendungsbereich', 'anwendungsbereich', anwendungsbereiche),
        this.renderSelect('Geo-Typ', 'geoTyp', geoTypen),
        this.renderInput('Fläche *', 'flaecheVolumen', { type: 'number', step: '0.01' }),
        this.renderSelect('Einheit', 'einheit', einheiten),
        this.renderSelect('Ort', 'ort_id', [
          { value: '', label: 'Bitte Ort wählen' },
          ...this.orte.map(ort => ({
            value: String(ort.id),
            label: ort.name || ort.bezeichnung || `Ort ${ort.id}`,
          })),
        ], { wrapperClass: 'field' }),
      ]),
      h('div', { class: 'modal-footer' }, [
        h('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: () => this.$emit('cancel'),
        }, 'Abbrechen'),
        h('button', {
          type: 'button',
          class: 'btn btn-primary',
          onClick: () => this.$emit('save'),
        }, 'Speichern'),
      ]),
    ]);
  },
};
