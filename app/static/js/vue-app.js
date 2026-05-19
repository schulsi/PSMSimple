(function initPsmVueApp() {
  if (!window.Vue) {
    console.warn('Vue wurde nicht geladen; die Oberfläche nutzt die Legacy-Steuerung.');
    return;
  }

  const tabToPath = window.PSM_TAB_TO_PATH || {
    home: '/',
    betrieb: '/betrieb',
    psm: '/psm',
    einsatzorte: '/fields',
    kulturen: '/cultures',
    export: '/export',
    history: '/history',
    settings: '/settings',
    forecast: '/prediction',
    inventory: '/inventory',
  };

  const pathToTab = window.PSM_PATH_TO_TAB || {
    '': 'home',
    home: 'home',
    betrieb: 'betrieb',
    farm: 'betrieb',
    psm: 'psm',
    fields: 'einsatzorte',
    cultures: 'kulturen',
    export: 'export',
    history: 'history',
    settings: 'settings',
    prediction: 'forecast',
    inventory: 'inventory',
  };

  function getTabFromPath() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    return pathToTab[path] || 'home';
  }

  function callIfExists(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') {
      return fn(...args);
    }
    return undefined;
  }

  function readBootstrapData() {
    const el = document.getElementById('psm-bootstrap-data');
    if (!el) return {};

    try {
      return JSON.parse(el.textContent);
    } catch (err) {
      console.warn('Vue-Bootstrap-Daten konnten nicht gelesen werden.', err);
      return {};
    }
  }

  const { createApp, h, nextTick, Teleport } = window.Vue;
  const bootstrap = readBootstrapData();

  const app = createApp({
    data() {
      const permissions = bootstrap.permissions || {};
      const user = bootstrap.user || {};
      const assets = bootstrap.assets || {};

      return {
        activeTab: getTabFromPath(),
        isMobileNavOpen: false,
        isUserPopupOpen: false,
        assets,
        permissions,
        user: {
          username: user.username || '',
          avatar: user.avatar || '?',
        },
      };
    },

    computed: {
      navSections() {
        const sections = [
          {
            label: '',
            items: [
              { tab: 'home', href: '/', icon: '🏠', label: 'Home' },
            ],
          },
          {
            label: 'Stammdaten',
            items: [
              { tab: 'betrieb', href: '/betrieb', icon: '🏡', label: 'Betrieb' },
              { tab: 'psm', href: '/psm', icon: '🧪', label: 'Pflanzenschutzmittel' },
              { tab: 'einsatzorte', href: '/fields', icon: '📍', label: 'Felder' },
              { tab: 'kulturen', href: '/cultures', icon: '🌾', label: 'Kulturen' },
            ],
          },
        ];

        if (this.permissions.can_export) {
          sections.push({
            label: 'Export',
            items: [
              {
                tab: 'export',
                href: '/export',
                icon: '📄',
                label: 'Applikation dokumentieren',
              },
            ],
          });
        }

        sections.push(
          {
            label: 'Verlauf',
            items: [
              { tab: 'history', href: '/history', icon: '🕘', label: 'Übersicht Applikationen' },
            ],
          },
          {
            label: 'Vorhersage',
            items: [
              { tab: 'forecast', href: '/prediction', icon: '📈', label: 'Beratung' },
            ],
          },
          {
            label: 'Lager',
            items: [
              {
                tab: 'inventory',
                href: '/inventory',
                icon: '📦',
                label: 'Lagerbestand',
                warningBadge: true,
              },
            ],
          },
        );

        return sections;
      },
    },

    beforeMount() {
      document.getElementById('psm-vue-header')?.replaceChildren();
      document.getElementById('psm-vue-nav')?.replaceChildren();
      document.getElementById('psm-vue-overlay')?.replaceChildren();
      document.getElementById('tab-home')?.replaceChildren();
    },

    mounted() {
      window.psmVueApp = this;

      this.applyTabClasses();
      this.applyMobileNavClasses();
      this.applyUserPopupClasses();
      history.replaceState({ tab: this.activeTab }, '', window.location.pathname);

      document.addEventListener('click', this.onDocumentClick);
      window.addEventListener('resize', this.onResize);
      window.addEventListener('popstate', this.onPopState);
    },

    beforeUnmount() {
      document.removeEventListener('click', this.onDocumentClick);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('popstate', this.onPopState);
    },

    render() {
      return [
        h(Teleport, { to: '#psm-vue-header' }, this.renderHeader()),
        h(Teleport, { to: '#psm-vue-overlay' }, this.renderOverlay()),
        h(Teleport, { to: '#psm-vue-nav' }, this.renderSidebar()),
        h(Teleport, { to: '#tab-home' }, this.renderHomeTab()),
      ];
    },

    methods: {
      renderHomeTab() {
        return h('div', { class: 'home-landing' }, [
          h('h1', { class: 'home-title' }, 'Willkommen bei PSMSimple'),
          h('div', { class: 'home-logo-wrap' }, [
            h('img', {
              src: this.assets.logo || '',
              alt: 'PSMSimple Logo',
              class: 'home-logo',
            }),
          ]),
          h('a', {
            href: '/export',
            class: 'btn-home-cta',
            onClick: (event) => {
              event.preventDefault();
              this.showTab('export', event.currentTarget);
            },
          }, [
            'Jetzt dokumentieren ',
            h('span', { class: 'cta-arrow' }, '→'),
          ]),
        ]);
      },

      renderHeader() {
        return [
          h('button', {
            class: 'nav-toggle',
            id: 'nav-toggle',
            type: 'button',
            'aria-label': this.isMobileNavOpen ? 'Menü schließen' : 'Menü öffnen',
            onClick: (event) => {
              event.stopPropagation();
              this.toggleMobileNav();
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
          onClick: () => this.closeMobileNav(),
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
                  this.showTab('settings', event.currentTarget);
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
                  this.logout();
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
                this.toggleUserPopup();
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
                this.openNavItem(item, event);
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

      openNavItem(item, event) {
        this.showTab(item.tab, event.currentTarget);
      },

      showTab(tabName, el = null, push = true) {
        if (!tabName) return;

        this.activeTab = tabName;
        this.applyTabClasses(el);
        this.closeUserPopup();

        if (window.innerWidth <= 640) {
          this.closeMobileNav();
        }

        if (push) {
          history.pushState({ tab: tabName }, '', tabToPath[tabName] || '/betrieb');
        }

        this.runTabHooks(tabName, el);
      },

      applyTabClasses(activeLink = null) {
        document.querySelectorAll('.tab').forEach(tab => {
          tab.classList.toggle('active', tab.id === `tab-${this.activeTab}`);
        });

        document.querySelectorAll('nav a[data-tab]').forEach(link => {
          const isActive = link === activeLink || link.dataset.tab === this.activeTab;
          link.classList.toggle('active', isActive);
        });
      },

      runTabHooks(tabName, el = null) {
        if (el?.dataset?.also) return;

        if (tabName === 'history') callIfExists('loadHistory');
        if (tabName === 'forecast') callIfExists('initForecastTab');
        if (tabName === 'inventory') callIfExists('loadInventory');
        if (tabName === 'export') {
          callIfExists('loadExportSelections');
          callIfExists('syncLegacyExportUI');
        }
      },

      toggleMobileNav() {
        this.isMobileNavOpen = !this.isMobileNavOpen;
        this.applyMobileNavClasses();
      },

      closeMobileNav() {
        this.isMobileNavOpen = false;
        this.applyMobileNavClasses();
      },

      applyMobileNavClasses() {
        document.querySelector('nav')?.classList.toggle('open', this.isMobileNavOpen);
        document.getElementById('psm-vue-overlay')?.classList.toggle('open', this.isMobileNavOpen);
      },

      toggleUserPopup() {
        this.isUserPopupOpen = !this.isUserPopupOpen;
        this.applyUserPopupClasses();

        if (this.isUserPopupOpen) {
          nextTick(() => this.positionUserPopup());
        }
      },

      closeUserPopup() {
        this.isUserPopupOpen = false;
        this.applyUserPopupClasses();
      },

      applyUserPopupClasses() {
        document.getElementById('user-popup')?.classList.toggle('open', this.isUserPopupOpen);
        document.getElementById('user-btn')?.classList.toggle('open', this.isUserPopupOpen);
      },

      positionUserPopup() {
        const popup = document.getElementById('user-popup');
        const button = document.getElementById('user-btn');
        if (!popup || !button) return;

        const rect = button.getBoundingClientRect();
        const popupWidth = 212;
        const top = rect.top - 8 - popup.offsetHeight;

        popup.style.left = `${Math.max(8, rect.left)}px`;
        popup.style.top = `${Math.max(8, top)}px`;
        popup.style.width = `${popupWidth}px`;
      },

      onDocumentClick(event) {
        const popup = document.getElementById('user-popup');
        const button = document.getElementById('user-btn');
        if (!popup || !button) return;

        const clickedInsidePopup = popup.contains(event.target);
        const clickedButton = button.contains(event.target);
        if (!clickedInsidePopup && !clickedButton) {
          this.closeUserPopup();
        }
      },

      onResize() {
        if (this.isUserPopupOpen) {
          this.positionUserPopup();
        }
      },

      onPopState(event) {
        const tabName = event.state?.tab || getTabFromPath();
        this.showTab(tabName, null, false);
      },

      logout() {
        callIfExists('logout');
      },
    },
  });

  app.mount('#psm-vue-app');
})();
