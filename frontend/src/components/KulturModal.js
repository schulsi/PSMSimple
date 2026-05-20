import { h } from 'vue';

function sortBySortierung(items) {
  return [...items].sort((a, b) => {
    const aSort = a.sortierung === '' || a.sortierung == null ? Number.MAX_SAFE_INTEGER : Number(a.sortierung);
    const bSort = b.sortierung === '' || b.sortierung == null ? Number.MAX_SAFE_INTEGER : Number(b.sortierung);
    return aSort - bSort;
  });
}

function displayValue(value) {
  return value === '' || value == null ? '-' : String(value);
}

export default {
  name: 'KulturModal',
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
  methods: {
    renderField(label, field, attrs = {}) {
      return h('div', { class: attrs.wrapperClass || 'field' }, [
        h('label', label),
        h('input', {
          id: `k-${field}`,
          value: this.form[field],
          placeholder: attrs.placeholder || '',
          onInput: event => this.$emit('update-field', field, event.target.value),
        }),
      ]);
    },

    renderOverview() {
      if (!this.bbchOverview.length) return null;

      return h('div', { id: 'bbch-overview' }, [
        h('div', { class: 'table-wrap' }, [
          h('table', { class: 'table bbch-table' }, [
            h('thead', [
              h('tr', [
                h('th', 'Code'),
                h('th', 'Bezeichnung'),
                h('th', 'Beschreibung'),
                h('th', 'Sortierung'),
                h('th', 'Aktionen'),
              ]),
            ]),
            h('tbody', sortBySortierung(this.bbchOverview).map(item => h('tr', { key: item.id }, [
              h('td', { 'data-label': 'Code' }, displayValue(item.code)),
              h('td', { 'data-label': 'Bezeichnung' }, displayValue(item.bezeichnung)),
              h('td', { 'data-label': 'Beschreibung' }, displayValue(item.beschreibung)),
              h('td', { 'data-label': 'Sortierung' }, displayValue(item.sortierung)),
              h('td', { 'data-label': 'Aktionen' }, [
                h('button', {
                  type: 'button',
                  class: 'btn btn-sm btn-danger',
                  onClick: () => this.$emit('delete-bbch-overview', item.id),
                }, 'Löschen'),
              ]),
            ]))),
          ]),
        ]),
      ]);
    },

    renderDraftTable() {
      if (!this.bbchDrafts.length) return null;

      return h('div', { class: 'bbch-table-wrap', id: 'bbch-editor-table-wrap' }, [
        h('table', { class: 'table bbch-table', id: 'bbch-editor-table' }, [
          h('colgroup', [
            h('col', { class: 'code-col' }),
            h('col', { class: 'label-col' }),
            h('col', { class: 'desc-col' }),
            h('col', { class: 'sort-col' }),
            h('col', { class: 'actions-col' }),
          ]),
          h('thead', [
            h('tr', [
              h('th', 'Code'),
              h('th', 'Bezeichnung'),
              h('th', 'Beschreibung'),
              h('th', 'Sortierung'),
              h('th', 'Aktion'),
            ]),
          ]),
          h('tbody', { id: 'bbch-list' }, this.bbchDrafts.map(item => this.renderDraftRow(item))),
        ]),
      ]);
    },

    renderDraftRow(item) {
      return h('tr', { key: item.key }, [
        this.renderDraftInputCell('Code', item, 'code', 'z. B. 65'),
        this.renderDraftInputCell('Bezeichnung', item, 'bezeichnung', 'z. B. Vollblüte'),
        h('td', { 'data-label': 'Beschreibung' }, [
          h('textarea', {
            class: 'bbch-input bbch-input--desc',
            value: item.beschreibung,
            placeholder: 'Optionale Beschreibung',
            onInput: event => this.$emit('update-bbch-field', item.key, 'beschreibung', event.target.value),
          }),
        ]),
        this.renderDraftInputCell('Sortierung', item, 'sortierung', 'z. B. 65', 'number'),
        h('td', { 'data-label': 'Aktion', class: 'actions-cell' }, [
          h('div', { class: 'bbch-row-actions' }, [
            h('button', {
              type: 'button',
              class: 'btn btn-sm btn-primary',
              onClick: () => this.$emit('save-bbch-row', item.key),
            }, 'Speichern'),
            h('button', {
              type: 'button',
              class: 'btn btn-sm btn-danger',
              onClick: () => this.$emit('remove-bbch-row', item.key),
            }, 'Löschen'),
          ]),
        ]),
      ]);
    },

    renderDraftInputCell(label, item, field, placeholder, type = 'text') {
      return h('td', { 'data-label': label }, [
        h('input', {
          type,
          class: 'bbch-input',
          value: item[field],
          placeholder,
          onInput: event => this.$emit('update-bbch-field', item.key, field, event.target.value),
        }),
      ]);
    },
  },
  render() {
    const hasAnyBbch = this.bbchOverview.length || this.bbchDrafts.length;

    return h('div', { class: 'modal' }, [
      h('h3', { id: 'modal-kultur-title' }, this.isEditing ? 'Kultur bearbeiten' : 'Kultur hinzufügen'),
      h('div', { class: 'form-grid' }, [
        this.renderField('Name *', 'name', { placeholder: 'Weinbau' }),
        this.renderField('EPPO-Code *', 'eppoCode', { placeholder: 'VITVI' }),
      ]),
      h('hr', { class: 'section-divider' }),
      h('div', { id: 'bbch-editor-section', 'data-mode': this.isEditing ? 'edit' : 'create' }, [
        h('div', { class: 'section-head' }, [
          h('div', [
            h('h4', { class: 'section-title' }, 'BBCH-Codes'),
            h('p', { class: 'section-subtitle' }, 'Bereits gespeicherte BBCH-Codes werden in der Tabelle angezeigt. Neue BBCH-Einträge kannst du direkt darunter erfassen.'),
          ]),
        ]),
        !hasAnyBbch
          ? h('div', { id: 'bbch-empty-state', class: 'empty' }, 'Noch keine BBCH-Einträge vorhanden.')
          : null,
        this.renderOverview(),
        h('div', { class: 'bbch-editor-wrap' }, [
          h('div', { class: 'bbch-editor-actions' }, [
            h('button', {
              type: 'button',
              class: 'btn btn-sm',
              id: 'btn-add-bbch-row',
              disabled: !this.isEditing,
              onClick: () => this.$emit('add-bbch-row'),
            }, '+ BBCH hinzufügen'),
          ]),
          this.renderDraftTable(),
        ]),
      ]),
      h('div', { class: 'modal-footer' }, [
        h('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onClick: () => this.$emit('cancel'),
        }, 'Abbrechen'),
        h('button', {
          type: 'button',
          class: 'btn btn-primary',
          onClick: () => this.$emit('save'),
        }, 'Speichern'),
      ]),
    ]);
  },
};
