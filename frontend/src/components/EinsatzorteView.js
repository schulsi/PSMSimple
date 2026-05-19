import { h } from 'vue';

function displayValue(value, fallback = '-') {
  return value || fallback;
}

export default {
  name: 'EinsatzorteView',
  props: {
    canWrite: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
    items: { type: Array, default: () => [] },
    orte: { type: Array, default: () => [] },
  },
  emits: ['edit', 'open-create', 'remove'],
  methods: {
    getOrtName(ortId) {
      const ort = this.orte.find(item => String(item.id) === String(ortId));
      return ort?.name || ort?.bezeichnung || (ortId ? `Ort #${ortId}` : '-');
    },

    renderList() {
      if (this.isLoading) {
        return [h('div', { class: 'empty' }, 'Einsatzorte werden geladen...')];
      }

      if (!this.items.length) {
        return [h('div', { class: 'empty' }, 'Noch keine Einsatzorte vorhanden.')];
      }

      return this.items.map(item => h('div', { class: 'item', key: item.id }, [
        h('div', { class: 'item-info' }, [
          h('div', { class: 'name' }, displayValue(item.name)),
          h('div', { class: 'meta' }, [
            displayValue(this.getOrtName(item.ort_id)),
            ' · ',
            displayValue(item.anwendungsbereich),
            ' · ',
            displayValue(item.geoTyp),
          ]),
          h('div', { class: 'meta' }, [
            displayValue(item.flaecheVolumen),
            ' ',
            displayValue(item.einheit, ''),
          ]),
        ]),
        this.canWrite
          ? h('div', { class: 'item-actions' }, [
            h('button', {
              type: 'button',
              class: 'btn btn-sm btn-ghost',
              onClick: () => this.$emit('edit', item.id),
            }, 'Bearbeiten'),
            h('button', {
              type: 'button',
              class: 'btn btn-sm btn-danger',
              onClick: () => this.$emit('remove', item.id),
            }, 'Löschen'),
          ])
          : null,
      ]));
    },
  },
  render() {
    return [
      h('h2', [
        '📍 Einsatzorte ',
        h('span', { class: 'badge', id: 'eo-count' }, String(this.items.length)),
      ]),
      this.canWrite
        ? h('button', {
          type: 'button',
          class: 'btn btn-primary mb-1',
          onClick: () => this.$emit('open-create'),
        }, '+ Neuer Einsatzort')
        : null,
      h('div', { class: 'item-list', id: 'einsatzorte-list' }, this.renderList()),
    ];
  },
};
