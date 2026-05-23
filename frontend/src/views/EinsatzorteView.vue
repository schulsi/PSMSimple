<template>
  <h2>
    📍 Felder <span id="eo-count" class="badge">{{ items.length }}</span>
  </h2>

  <Button
    v-if="canWrite"
    type="button"
    class="btn btn-primary mb-1"
    label="+ Neues Feld"
    @click="$emit('open-create')"
  />

  <div id="einsatzorte-list" class="item-list">
    <div v-if="isLoading" class="empty">Felder werden geladen...</div>
    <div v-else-if="!items.length" class="empty">Noch keine Felder vorhanden.</div>
    <div v-for="item in items" v-else :key="item.id" class="item">
      <div class="item-info">
        <div class="name">{{ displayValue(item.name) }}</div>
        <div class="meta">
          {{ displayValue(getOrtName(item.ort_id)) }} ·
          {{ displayValue(getKulturName(item.kultur_id)) }} ·
          {{ displayValue(item.anwendungsbereich) }} ·
          {{ displayValue(item.geoTyp) }}
        </div>
        <div class="meta">
          {{ displayValue(item.flaecheVolumen) }} {{ displayValue(item.einheit, '') }}
        </div>
      </div>
      <div v-if="canWrite" class="item-actions">
        <Button
          type="button"
          class="btn btn-sm btn-ghost p-button-secondary"
          label="Bearbeiten"
          @click="$emit('edit', item.id)"
        />
        <Button
          type="button"
          class="btn btn-sm btn-danger p-button-danger"
          label="Löschen"
          @click="$emit('remove', item.id)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Button from 'primevue/button';

export default {
  name: 'FelderView',
  components: {
    Button,
  },
  props: {
    canWrite: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
    items: { type: Array, default: () => [] },
    kulturen: { type: Array, default: () => [] },
    orte: { type: Array, default: () => [] },
  },
  emits: ['edit', 'open-create', 'remove'],
  methods: {
    displayValue(value, fallback = '-') {
      return value || fallback;
    },
    getOrtName(ortId) {
      const ort = this.orte.find(item => String(item.id) === String(ortId));
      return ort?.name || ort?.bezeichnung || (ortId ? `Ort #${ortId}` : '-');
    },
    getKulturName(kulturId) {
      const kultur = this.kulturen.find(item => String(item.id) === String(kulturId));
      return kultur?.name || (kulturId ? `Kultur #${kulturId}` : '-');
    },
  },
};
</script>
