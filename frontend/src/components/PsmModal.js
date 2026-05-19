import { h } from 'vue';

const beeOptions = [
  ['B1', '(B1) Bienengefährlich'],
  ['B2', '(B2) Bienengefährlich außer nach dem täglichen Bienenflug'],
  ['B3', '(B3) Bienengefährlich, Anwendungsverbot'],
  ['B4', '(B4) Nicht bienengefährlich'],
];

export default {
  name: 'PsmModal',
  props: {
    form: { type: Object, required: true },
    isEditing: { type: Boolean, default: false },
    isInfoLoading: { type: Boolean, default: false },
    searchResults: { type: Array, default: () => [] },
    showSearchResults: { type: Boolean, default: false },
  },
  emits: ['cancel', 'save', 'search', 'select-search-result', 'update-field'],
  render() {
    return h('div', { class: 'modal' }, [
      h('h3', { id: 'modal-psm-title' }, this.isEditing ? 'Pflanzenschutzmittel bearbeiten' : 'Pflanzenschutzmittel hinzufügen'),
      h('div', { class: 'form-grid' }, [
        h('div', { class: 'field' }, [
          h('label', { for: 'psm-name' }, 'Name'),
          h('div', { class: 'autocomplete-wrap' }, [
            h('input', {
              id: 'psm-name',
              autocomplete: 'off',
              disabled: this.isInfoLoading,
              value: this.form.name,
              onInput: (event) => {
                this.$emit('update-field', 'name', event.target.value);
                this.$emit('search', event.target.value);
              },
            }),
            h('div', {
              id: 'psm-search-results',
              class: ['autocomplete-results', { show: this.showSearchResults }],
            }, this.renderSearchResults()),
          ]),
        ]),
        this.renderField('Zulassungsnr.', 'psm-zulassungsnr', 'zulassungsnr', { disabled: true }),
        this.renderField('Wirkstoffe', 'psm-wirkstoffe', 'wirkstoffe', { disabled: true }),
        h('div', { class: 'field' }, [
          h('label', { for: 'psm-aufwandEinheit' }, 'Einheit (Aufwandsmenge)'),
          h('input', {
            id: 'psm-aufwandEinheit',
            name: 'einheit',
            list: 'einheiten',
            value: this.form.aufwandEinheit,
            onInput: event => this.$emit('update-field', 'aufwandEinheit', event.target.value),
          }),
          h('datalist', { id: 'einheiten' }, [
            h('option', { value: 'kg/ha' }),
            h('option', { value: 'l/ha' }),
            h('option', { value: 'g/ha' }),
            h('option', { value: 'ml/ha' }),
          ]),
        ]),
        h('div', { class: 'field span-2' }, [
          h('label', { for: 'psm-bienen' }, 'Bienengefährlichkeit'),
          h('select', {
            id: 'psm-bienen',
            class: 'small-select',
            value: this.form.bienen,
            onChange: event => this.$emit('update-field', 'bienen', event.target.value),
          }, beeOptions.map(([value, label]) => h('option', { value }, label))),
        ]),
        this.renderField('Lagereinheit', 'psm-lager_einheit', 'lager_einheit'),
        this.renderField('Mindestbestand', 'psm-min_lager', 'min_lager', { type: 'number', step: '0.01' }),
        this.renderField('Warnbestand', 'psm-warnung_lager', 'warnung_lager', { type: 'number', step: '0.01' }),
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
          id: 'psm-save-btn',
          disabled: this.isInfoLoading,
          onClick: () => this.$emit('save'),
        }, this.isInfoLoading ? 'Lade Daten ...' : 'Speichern'),
      ]),
    ]);
  },
  methods: {
    renderField(label, inputId, field, attrs = {}) {
      const { wrapperClass, ...inputAttrs } = attrs;
      return h('div', { class: wrapperClass || 'field' }, [
        h('label', { for: inputId }, label),
        h('input', {
          id: inputId,
          value: this.form[field],
          onInput: event => this.$emit('update-field', field, event.target.value),
          ...inputAttrs,
        }),
      ]);
    },

    renderSearchResults() {
      if (!this.showSearchResults) return [];

      if (!this.searchResults.length) {
        return [h('div', { class: 'autocomplete-empty' }, 'Keine Treffer')];
      }

      return this.searchResults.map(item => h('div', {
        class: 'autocomplete-item',
        key: `${item.kennr}-${item.name}`,
        onClick: () => this.$emit('select-search-result', item),
      }, [
        item.name,
        ' ',
        h('span', { class: 'text-muted' }, `(${item.kennr || ''})`),
      ]));
    },
  },
};
