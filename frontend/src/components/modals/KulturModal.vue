<template>
  <div class="modal">
    <h3 id="modal-kultur-title">{{ isEditing ? 'Kultur bearbeiten' : 'Kultur hinzufügen' }}</h3>

    <div class="form-grid">
      <div class="field">
        <label for="k-name">Name *</label>
        <InputText
          id="k-name"
          :model-value="form.name"
          placeholder="Weinbau"
          @update:model-value="$emit('update-field', 'name', $event)"
        />
      </div>
      <div class="field">
        <label for="k-eppoCode">EPPO-Code *</label>
        <InputText
          id="k-eppoCode"
          :model-value="form.eppoCode"
          placeholder="VITVI"
          @update:model-value="$emit('update-field', 'eppoCode', $event)"
        />
      </div>
    </div>

    <hr class="section-divider">

    <div id="bbch-editor-section" :data-mode="isEditing ? 'edit' : 'create'">
      <div class="section-head">
        <div>
          <h4 class="section-title">BBCH-Codes</h4>
          <p class="section-subtitle">
            Bereits gespeicherte BBCH-Codes werden in der Tabelle angezeigt.
            Neue BBCH-Einträge kannst du direkt darunter erfassen.
          </p>
        </div>
      </div>

      <div v-if="!hasAnyBbch" id="bbch-empty-state" class="empty">Noch keine BBCH-Einträge vorhanden.</div>

      <div v-if="bbchOverview.length" id="bbch-overview">
        <div class="table-wrap">
          <table class="table bbch-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Bezeichnung</th>
                <th>Beschreibung</th>
                <th>Sortierung</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sortedBbchOverview" :key="item.id">
                <td data-label="Code">{{ displayValue(item.code) }}</td>
                <td data-label="Bezeichnung">{{ displayValue(item.bezeichnung) }}</td>
                <td data-label="Beschreibung">{{ displayValue(item.beschreibung) }}</td>
                <td data-label="Sortierung">{{ displayValue(item.sortierung) }}</td>
                <td data-label="Aktionen">
                  <Button
                    type="button"
                    class="btn btn-sm btn-danger p-button-danger"
                    label="Löschen"
                    @click="$emit('delete-bbch-overview', item.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bbch-editor-wrap">
        <div class="bbch-editor-actions">
          <Button
            id="btn-add-bbch-row"
            type="button"
            class="btn btn-sm p-button-secondary"
            :disabled="!isEditing"
            label="+ BBCH hinzufügen"
            @click="$emit('add-bbch-row')"
          />
        </div>

        <div v-if="bbchDrafts.length" id="bbch-editor-table-wrap" class="bbch-table-wrap">
          <table id="bbch-editor-table" class="table bbch-table">
            <colgroup>
              <col class="code-col">
              <col class="label-col">
              <col class="desc-col">
              <col class="sort-col">
              <col class="actions-col">
            </colgroup>
            <thead>
              <tr>
                <th>Code</th>
                <th>Bezeichnung</th>
                <th>Beschreibung</th>
                <th>Sortierung</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody id="bbch-list">
              <tr v-for="item in bbchDrafts" :key="item.key">
                <td data-label="Code">
                  <InputText
                    class="bbch-input"
                    :model-value="item.code"
                    placeholder="z. B. 65"
                    @update:model-value="$emit('update-bbch-field', item.key, 'code', $event)"
                  />
                </td>
                <td data-label="Bezeichnung">
                  <InputText
                    class="bbch-input"
                    :model-value="item.bezeichnung"
                    placeholder="z. B. Vollblüte"
                    @update:model-value="$emit('update-bbch-field', item.key, 'bezeichnung', $event)"
                  />
                </td>
                <td data-label="Beschreibung">
                  <Textarea
                    class="bbch-input bbch-input--desc"
                    :model-value="item.beschreibung"
                    placeholder="Optionale Beschreibung"
                    @update:model-value="$emit('update-bbch-field', item.key, 'beschreibung', $event)"
                  />
                </td>
                <td data-label="Sortierung">
                  <InputText
                    type="number"
                    class="bbch-input"
                    :model-value="item.sortierung"
                    placeholder="z. B. 65"
                    @update:model-value="$emit('update-bbch-field', item.key, 'sortierung', $event)"
                  />
                </td>
                <td data-label="Aktion" class="actions-cell">
                  <div class="bbch-row-actions">
                    <Button
                      type="button"
                      class="btn btn-sm btn-primary"
                      label="Speichern"
                      @click="$emit('save-bbch-row', item.key)"
                    />
                    <Button
                      type="button"
                      class="btn btn-sm btn-danger p-button-danger"
                      label="Löschen"
                      @click="$emit('remove-bbch-row', item.key)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <Button type="button" class="btn btn-ghost p-button-secondary" label="Abbrechen" @click="$emit('cancel')" />
      <Button type="button" class="btn btn-primary" label="Speichern" @click="$emit('save')" />
    </div>
  </div>
</template>

<script>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';

function sortBySortierung(items) {
  return [...items].sort((a, b) => {
    const aSort = a.sortierung === '' || a.sortierung == null ? Number.MAX_SAFE_INTEGER : Number(a.sortierung);
    const bSort = b.sortierung === '' || b.sortierung == null ? Number.MAX_SAFE_INTEGER : Number(b.sortierung);
    return aSort - bSort;
  });
}

export default {
  name: 'KulturModal',
  components: {
    Button,
    InputText,
    Textarea,
  },
  props: {
    form: { type: Object, required: true },
    isEditing: { type: Boolean, default: false },
    bbchDrafts: { type: Array, default: () => [] },
    bbchOverview: { type: Array, default: () => [] },
  },
  emits: [
    'add-bbch-row',
    'cancel',
    'delete-bbch-overview',
    'remove-bbch-row',
    'save',
    'save-bbch-row',
    'update-bbch-field',
    'update-field',
  ],
  computed: {
    hasAnyBbch() {
      return !!(this.bbchOverview.length || this.bbchDrafts.length);
    },
    sortedBbchOverview() {
      return sortBySortierung(this.bbchOverview);
    },
  },
  methods: {
    displayValue(value) {
      return value === '' || value == null ? '-' : String(value);
    },
  },
};
</script>
