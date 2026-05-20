import { h } from 'vue';

function displayValue(value) {
  return value || '-';
}

export default {
  name: 'KulturenView',
  props: {
    canWrite: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
    items: { type: Array, default: () => [] },
  },
  emits: ['edit', 'open-create', 'remove'],
  methods: {
    renderList() {
      if (this.isLoading) {
        return [h('div', { class: 'empty' }, 'Kulturen werden geladen...')];
      }

      if (!this.items.length) {
        return [h('div', { class: 'empty' }, 'Noch keine Kulturen vorhanden.')];
      }

      return this.items.map(item => h('div', { class: 'item', key: item.id }, [
        h('div', { class: 'item-info' }, [
          h('div', { class: 'name' }, displayValue(item.name)),
          h('div', { class: 'meta' }, `EPPO-Code: ${displayValue(item.eppoCode)}`),
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
        '🌾 Kulturen ',
        h('span', { class: 'badge', id: 'kult-count' }, String(this.items.length)),
      ]),
      this.canWrite
        ? h('button', {
          type: 'button',
          class: 'btn btn-primary mb-1',
          onClick: () => this.$emit('open-create'),
        }, '+ Neue Kultur')
        : null,
      h('div', { class: 'item-list', id: 'kulturen-list' }, this.renderList()),
    ];
  },
};
