import { h } from 'vue';

function display(value) {
  return value || '—';
}

export default {
  name: 'PsmView',
  props: {
    canWrite: {
      type: Boolean,
      default: false,
    },
    items: {
      type: Array,
      default: () => [],
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['edit', 'open-create', 'remove'],
  render() {
    return [
      h('h2', [
        '🧪 Pflanzenschutzmittel ',
        h('span', { class: 'badge', id: 'psm-count' }, String(this.items.length)),
      ]),
      this.canWrite
        ? h('button', {
          type: 'button',
          class: 'btn btn-primary mb-1',
          onClick: () => this.$emit('open-create'),
        }, '+ Neues Mittel')
        : null,
      h('div', { class: 'item-list', id: 'psm-list' }, this.renderList()),
    ];
  },
  methods: {
    renderList() {
      if (this.isLoading) {
        return [h('div', { class: 'empty' }, 'Pflanzenschutzmittel werden geladen...')];
      }

      if (!this.items.length) {
        return [h('div', { class: 'empty' }, 'Noch keine Pflanzenschutzmittel vorhanden.')];
      }

      return this.items.map(item => h('div', { class: 'item', key: item.id }, [
        h('div', { class: 'item-info' }, [
          h('div', { class: 'name' }, display(item.name)),
          h('div', { class: 'meta' }, `Zul.-Nr.: ${display(item.zulassungsnr)}`),
          h('div', { class: 'meta' }, `Wirkstoffe: ${display(item.wirkstoffe)}`),
          h('div', { class: 'meta' }, `Einheit: ${display(item.aufwandEinheit)} · Bienen: ${display(item.bienen)}`),
        ]),
        h('div', { class: 'item-actions' }, [
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
        ]),
      ]));
    },
  },
};
