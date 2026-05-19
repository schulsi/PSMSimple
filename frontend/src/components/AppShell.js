import { h, Teleport } from 'vue';

export default {
  name: 'AppShell',
  props: {
    activeTab: { type: String, required: true },
    isMobileNavOpen: { type: Boolean, default: false },
    isUserPopupOpen: { type: Boolean, default: false },
    navSections: { type: Array, required: true },
    permissions: { type: Object, required: true },
    user: { type: Object, required: true },
  },
  emits: ['close-mobile-nav', 'logout', 'open-tab', 'toggle-mobile-nav', 'toggle-user-popup'],
  methods: {
    renderHeader() {
      return [
        h('button', {
          class: 'nav-toggle',
          id: 'nav-toggle',
          type: 'button',
          'aria-label': this.isMobileNavOpen ? 'Menü schließen' : 'Menü öffnen',
          onClick: (event) => {
            event.stopPropagation();
            this.$emit('toggle-mobile-nav');
          },
        }, '☰'),
        h('div', { class: 'logo' }, [
          '🌿 Pflanzen',
          h('span', 'schutz'),
        ]),
        h('div', { class: 'sub' }, 'Dokumentation & JSON-Export'),
      ];
    },

    renderOverlay() {
      return h('button', {
        type: 'button',
        class: 'nav-overlay-button',
        'aria-label': 'Menü schließen',
        onClick: () => this.$emit('close-mobile-nav'),
      });
    },

    renderSidebar() {
      return [
        h('div', { class: 'nav-items' }, this.renderNavSections()),
        h('div', { class: 'nav-user' }, [
          h('div', { class: 'nav-user-popup', id: 'user-popup' }, [
            h('div', { class: 'popup-header' }, [
              h('div', { class: 'popup-label' }, 'Angemeldet als'),
              h('div', { class: 'popup-username', id: 'popup-username' }, this.user.username),
              h('div', { class: 'popup-label' }, `Rolle: ${this.permissions.role || ''}`),
            ]),
            h('a', {
              href: '/settings',
              'data-tab': 'settings',
              class: 'popup-button-reset',
              onClick: (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.$emit('open-tab', 'settings', event.currentTarget);
              },
            }, [
              h('span', { class: 'ico' }, '⚙️'),
              h('div', { class: 'popup-label' }, 'Einstellungen'),
            ]),
            h('button', {
              type: 'button',
              class: 'popup-button-reset',
              onClick: (event) => {
                event.stopPropagation();
                this.$emit('logout');
              },
            }, [
              h('span', { class: 'ico' }, '🚪'),
              h('div', { class: 'popup-label' }, 'Abmelden'),
            ]),
          ]),
          h('button', {
            type: 'button',
            class: ['nav-user-btn', { open: this.isUserPopupOpen }],
            id: 'user-btn',
            onClick: (event) => {
              event.stopPropagation();
              this.$emit('toggle-user-popup');
            },
          }, [
            h('div', { class: 'nav-user-avatar', id: 'user-avatar' }, this.user.avatar),
            h('span', { class: 'nav-user-name', id: 'user-name-label' }, this.user.username),
            h('span', { class: 'nav-user-caret' }, '▲'),
          ]),
        ]),
      ];
    },

    renderNavSections() {
      return this.navSections.flatMap((section) => {
        const children = [];

        if (section.label) {
          children.push(h('div', {
            class: 'section-label',
            key: `${section.label}-label`,
          }, section.label));
        }

        section.items.forEach((item) => {
          children.push(h('a', {
            href: item.href,
            'data-tab': item.tab,
            class: { active: this.activeTab === item.tab },
            key: item.tab,
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.$emit('open-tab', item.tab, event.currentTarget);
            },
          }, [
            h('span', { class: 'ico' }, item.icon),
            ` ${item.label}`,
            item.warningBadge
              ? h('span', {
                class: 'badge badge-critical hidden',
                id: 'inventory-warning-count',
              })
              : null,
          ]));
        });

        return children;
      });
    },
  },
  render() {
    return [
      h(Teleport, { to: '#psm-vue-header' }, this.renderHeader()),
      h(Teleport, { to: '#psm-vue-overlay' }, this.renderOverlay()),
      h(Teleport, { to: '#psm-vue-nav' }, this.renderSidebar()),
    ];
  },
};
