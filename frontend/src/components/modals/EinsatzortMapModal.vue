<template>
  <div class="modal">
    <h3>🗺 Standort auf Karte wählen</h3>
    <div id="eo-map"></div>
    <div class="map-coords-bar">
      📍 Gewählt:
      <strong id="map-lat-display">{{ hasSelection ? String(selectedLat) : '-' }}</strong>
      /
      <strong id="map-lng-display">{{ hasSelection ? String(selectedLng) : '-' }}</strong>
    </div>
    <p class="map-hint">Auf die Karte klicken um einen Punkt zu setzen · Marker ist verschiebbar</p>
    <div class="modal-footer">
      <Button type="button" class="btn btn-ghost p-button-secondary" label="Abbrechen" @click="$emit('cancel')" />
      <Button
        id="map-confirm-btn"
        type="button"
        class="btn btn-primary"
        :disabled="!hasSelection"
        label="✅ Koordinaten übernehmen"
        @click="$emit('confirm')"
      />
    </div>
  </div>
</template>

<script>
import Button from 'primevue/button';

export default {
  name: 'FeldMapModal',
  components: {
    Button,
  },
  props: {
    hasSelection: { type: Boolean, default: false },
    selectedLat: { type: [Number, String], default: '-' },
    selectedLng: { type: [Number, String], default: '-' },
  },
  emits: ['cancel', 'confirm'],
};
</script>
