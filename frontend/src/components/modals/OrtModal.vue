<template>
  <div class="modal">
    <h3 id="modal-ort-title">{{ isEditing ? 'Ort bearbeiten' : 'Neuer Ort' }}</h3>

    <div class="form-grid">
      <div class="field">
        <label for="o-name">Name</label>
        <input id="o-name" :value="form.name" @input="updateField('name', $event.target.value)" />
      </div>

      <div class="field">
        <label for="o-plz">PLZ</label>
        <input id="o-plz" :value="form.plz" @input="updateField('plz', $event.target.value)" />
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Abbrechen</button>
      <button type="button" class="btn btn-primary" :disabled="isSaving" @click="$emit('save')">
        {{ isSaving ? 'Speichern...' : 'Speichern' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrtModal',
  props: {
    form: {
      type: Object,
      required: true,
    },
    isEditing: { type: Boolean, default: false },
    isSaving: { type: Boolean, default: false },
  },
  emits: ['cancel', 'save', 'update-field'],
  methods: {
    updateField(field, value) {
      this.$emit('update-field', field, value);
    },
  },
};
</script>
