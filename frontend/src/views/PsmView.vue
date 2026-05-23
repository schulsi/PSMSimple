<template>
  <h2>
    🧪 Pflanzenschutzmittel <span id="psm-count" class="badge">{{ items.length }}</span>
  </h2>

  <Button
    v-if="canWrite"
    type="button"
    class="btn btn-primary mb-1"
    label="+ Neues Mittel"
    @click="$emit('open-create')"
  />

  <div id="psm-list" class="item-list">
    <div v-if="isLoading" class="empty">Pflanzenschutzmittel werden geladen...</div>
    <div v-else-if="!items.length" class="empty">Noch keine Pflanzenschutzmittel vorhanden.</div>
    <div v-for="item in items" v-else :key="item.id" class="item">
      <div class="item-info">
        <div class="name">{{ display(item.name) }}</div>
        <div class="meta">Zul.-Nr.: {{ display(item.zulassungsnr) }}</div>
        <div class="meta">Wirkstoffe: {{ display(item.wirkstoffe) }}</div>
        <div class="meta">
          Einheit: {{ display(item.aufwandEinheit) }} · Bienen: {{ display(item.bienen) }}
        </div>
      </div>
      <div class="item-actions">
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
  name: 'PsmView',
  components: {
    Button,
  },
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
  methods: {
    display(value) {
      return value || '—';
    },
  },
};
</script>
