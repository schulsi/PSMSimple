<template>
  <div class="modal">
    <h3 id="modal-einsatzort-title">{{ isEditing ? 'Einsatzort bearbeiten' : 'Einsatzort hinzufügen' }}</h3>

    <div class="form-grid">
      <div class="field span-2">
        <label for="eo-name">Name / Bezeichnung *</label>
        <input id="eo-name" :value="form.name" @input="updateField('name', $event.target.value)" />
      </div>

      <div class="field span-2">
        <label>Koordinaten</label>
        <div class="map-picker-row">
          <input
            id="eo-gpsRechtswert"
            type="number"
            step="any"
            placeholder="Lat, z.B. 48.123456"
            required
            :value="form.gpsRechtswert"
            @input="updateField('gpsRechtswert', $event.target.value)"
          />
          <input
            id="eo-gpsHochwert"
            type="number"
            step="any"
            placeholder="Lng, z.B. 7.654321"
            required
            :value="form.gpsHochwert"
            @input="updateField('gpsHochwert', $event.target.value)"
          />
          <button type="button" class="btn btn-ghost btn-sm nowrap shrink-0" @click="$emit('open-map')">
            🗺 Karte anzeigen
          </button>
        </div>
      </div>

      <div class="field">
        <label for="eo-anwendungsbereich">Anwendungsbereich</label>
        <select
          id="eo-anwendungsbereich"
          :value="form.anwendungsbereich"
          @change="updateField('anwendungsbereich', $event.target.value)"
        >
          <option v-for="option in anwendungsbereiche" :key="option" :value="option">{{ option }}</option>
        </select>
      </div>

      <div class="field">
        <label for="eo-geoTyp">Geo-Typ</label>
        <select id="eo-geoTyp" :value="form.geoTyp" @change="updateField('geoTyp', $event.target.value)">
          <option v-for="option in geoTypen" :key="option" :value="option">{{ option }}</option>
        </select>
      </div>

      <div class="field">
        <label for="eo-flaecheVolumen">Fläche *</label>
        <input
          id="eo-flaecheVolumen"
          type="number"
          step="0.01"
          :value="form.flaecheVolumen"
          @input="updateField('flaecheVolumen', $event.target.value)"
        />
      </div>

      <div class="field">
        <label for="eo-einheit">Einheit</label>
        <select id="eo-einheit" :value="form.einheit" @change="updateField('einheit', $event.target.value)">
          <option v-for="option in einheiten" :key="option" :value="option">{{ option }}</option>
        </select>
      </div>

      <div class="field">
        <label for="eo-ort_id">Ort</label>
        <select id="eo-ort_id" :value="form.ort_id" @change="updateField('ort_id', $event.target.value)">
          <option value="">Bitte Ort wählen</option>
          <option v-for="ort in orte" :key="ort.id" :value="String(ort.id)">
            {{ ort.name || ort.bezeichnung || `Ort ${ort.id}` }}
          </option>
        </select>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-ghost" @click="$emit('cancel')">Abbrechen</button>
      <button type="button" class="btn btn-primary" @click="$emit('save')">Speichern</button>
    </div>
  </div>
</template>

<script>
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
  setup(_props, { emit }) {
    function updateField(field, value) {
      emit('update-field', field, value);
    }

    return {
      anwendungsbereiche,
      einheiten,
      geoTypen,
      updateField,
    };
  },
};
</script>
