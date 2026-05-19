import { h } from 'vue';

export default {
  name: 'EinsatzortMapModal',
  props: {
    hasSelection: { type: Boolean, default: false },
    selectedLat: { type: [Number, String], default: '-' },
    selectedLng: { type: [Number, String], default: '-' },
  },
  emits: ['cancel', 'confirm'],
  render() {
    return h('div', { class: 'modal' }, [
      h('h3', '🗺 Standort auf Karte wählen'),
      h('div', { id: 'eo-map' }),
      h('div', { class: 'map-coords-bar' }, [
        '📍 Gewählt: ',
        h('strong', { id: 'map-lat-display' }, this.hasSelection ? String(this.selectedLat) : '-'),
        ' / ',
        h('strong', { id: 'map-lng-display' }, this.hasSelection ? String(this.selectedLng) : '-'),
      ]),
      h('p', { class: 'map-hint' }, 'Auf die Karte klicken um einen Punkt zu setzen · Marker ist verschiebbar'),
      h('div', { class: 'modal-footer' }, [
        h('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: () => this.$emit('cancel'),
        }, 'Abbrechen'),
        h('button', {
          type: 'button',
          id: 'map-confirm-btn',
          class: 'btn btn-primary',
          disabled: !this.hasSelection,
          onClick: () => this.$emit('confirm'),
        }, '✅ Koordinaten übernehmen'),
      ]),
    ]);
  },
};
