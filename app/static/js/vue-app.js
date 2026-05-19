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
  const bundeslandOptions = [
    ['BW', 'Baden-Württemberg'],
    ['BY', 'Bayern'],
    ['BE', 'Berlin'],
    ['BB', 'Brandenburg'],
    ['HB', 'Bremen'],
    ['HH', 'Hamburg'],
    ['HE', 'Hessen'],
    ['MV', 'Mecklenburg-Vorpommern'],
    ['NI', 'Niedersachsen'],
    ['NW', 'Nordrhein-Westfalen'],
    ['RP', 'Rheinland-Pfalz'],
    ['SL', 'Saarland'],
    ['SN', 'Sachsen'],
    ['ST', 'Sachsen-Anhalt'],
    ['SH', 'Schleswig-Holstein'],
    ['TH', 'Thüringen'],
  ];

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
        betriebExists: false,
        betriebForm: {
          firma: '',
          name: '',
          vorname: '',
          strHnr: '',
          plz: '',
          ort: '',
          bundesland: 'BW',
        },
        betriebWizardForm: {
          firma: '',
          name: '',
          vorname: '',
          strHnr: '',
          plz: '',
          ort: '',
          bundesland: 'BW',
          verantwortlicher: '',
          anwender: '',
          localSave: true,
        },
        isBetriebSaving: false,
        isBetriebWizardSaving: false,
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
      document.getElementById('tab-betrieb')?.replaceChildren();
      document.getElementById('modal-betrieb-wizard')?.replaceChildren();
    },

    mounted() {
      window.psmVueApp = this;
      window.loadBetrieb = () => this.loadBetrieb();
      window.saveBetrieb = () => this.saveBetrieb();
      window.saveBetriebWizard = () => this.saveBetriebWizard();
      window.fillBetriebForm = betrieb => this.applyBetriebForm(betrieb);
      window.collectBetriebForm = () => this.collectBetriebForm();
      window.collectWizardBetriebForm = () => this.collectWizardBetriebForm();
      window.collectWizardSaveMode = () => this.collectWizardSaveMode();

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
        h(Teleport, { to: '#tab-betrieb' }, this.renderBetriebTab()),
        h(Teleport, { to: '#modal-betrieb-wizard' }, this.renderBetriebWizard()),
      ];
    },

    methods: {
      applyBetriebForm(betrieb = {}) {
        this.betriebForm = {
          firma: betrieb.firma || '',
          name: betrieb.name || '',
          vorname: betrieb.vorname || '',
          strHnr: betrieb.strHnr || '',
          plz: betrieb.plz || '',
          ort: betrieb.ort || '',
          bundesland: betrieb.bundesland || 'BW',
        };
      },

      collectBetriebForm() {
        return {
          firma: this.betriebForm.firma.trim(),
          name: this.betriebForm.name.trim(),
          vorname: this.betriebForm.vorname.trim(),
          strHnr: this.betriebForm.strHnr.trim(),
          plz: this.betriebForm.plz.trim(),
          ort: this.betriebForm.ort.trim(),
          bundesland: this.betriebForm.bundesland || 'BW',
        };
      },

      collectWizardBetriebForm() {
        return {
          firma: this.betriebWizardForm.firma.trim(),
          name: this.betriebWizardForm.name.trim(),
          vorname: this.betriebWizardForm.vorname.trim(),
          strHnr: this.betriebWizardForm.strHnr.trim(),
          plz: this.betriebWizardForm.plz.trim(),
          ort: this.betriebWizardForm.ort.trim(),
          bundesland: this.betriebWizardForm.bundesland || 'BW',
          verantwortlicher: this.betriebWizardForm.verantwortlicher.trim(),
          anwender: this.betriebWizardForm.anwender.trim(),
        };
      },

      collectWizardSaveMode() {
        return {
          browser_download: !this.betriebWizardForm.localSave,
          local_save: this.betriebWizardForm.localSave,
        };
      },

      async loadBetrieb() {
        try {
          const apiGetFn = window.apiGet;
          if (typeof apiGetFn !== 'function') return;

          const betrieb = await apiGetFn('/api/betrieb');
          if (!betrieb || !betrieb.id) {
            this.betriebExists = false;
            callIfExists('openBetriebWizard');
            return;
          }

          this.betriebExists = true;
          this.applyBetriebForm(betrieb);
        } catch (err) {
          console.error(err);
          callIfExists('toast', '❌ Betrieb konnte nicht geladen werden');
        }
      },

      async saveBetrieb() {
        try {
          const apiPostFn = window.apiPost;
          if (typeof apiPostFn !== 'function') return;

          this.isBetriebSaving = true;
          await apiPostFn('/api/betrieb', this.collectBetriebForm());
          this.betriebExists = true;
          callIfExists('toast', '✅ Betrieb gespeichert');
        } catch (err) {
          console.error(err);
          callIfExists('toast', `❌ ${err.message}`);
        } finally {
          this.isBetriebSaving = false;
        }
      },

      async saveBetriebWizard() {
        try {
          const apiPostFn = window.apiPost;
          if (typeof apiPostFn !== 'function') return;

          this.isBetriebWizardSaving = true;
          const payload = this.collectWizardBetriebForm();
          const wizSaveMode = this.collectWizardSaveMode();

          await apiPostFn('/api/betrieb', {
            firma: payload.firma,
            name: payload.name,
            vorname: payload.vorname,
            strHnr: payload.strHnr,
            plz: payload.plz,
            ort: payload.ort,
            bundesland: payload.bundesland,
          });

          await apiPostFn('/api/user/settings', {
            browser_download: wizSaveMode.browser_download,
            local_save: wizSaveMode.local_save,
            default_anwender: payload.anwender,
            default_verantwortlich: payload.verantwortlicher,
          });

          const settingsToggle = document.getElementById('save-mode-toggle');
          if (settingsToggle) {
            settingsToggle.checked = wizSaveMode.local_save;
            callIfExists('updateSaveModeLabels', wizSaveMode.local_save);
          }

          callIfExists('updateExportButtons', wizSaveMode.local_save);
          callIfExists('applyDefaultSettingsToExport', {
            default_anwender: payload.anwender,
            default_verantwortlich: payload.verantwortlicher,
          });

          const defaultAnwender = document.getElementById('set-default-anwender');
          const defaultVerantwortlich = document.getElementById('set-default-verantwortlich');
          if (defaultAnwender) defaultAnwender.value = payload.anwender || '';
          if (defaultVerantwortlich) defaultVerantwortlich.value = payload.verantwortlicher || '';

          this.applyBetriebForm(payload);
          this.betriebExists = true;
          callIfExists('closeModal', 'modal-betrieb-wizard');
          callIfExists('toast', '✅ Betriebsdaten gespeichert');
        } catch (err) {
          console.error(err);
          callIfExists('toast', `❌ ${err.message}`);
        } finally {
          this.isBetriebWizardSaving = false;
        }
      },

      updateBetriebField(field, value) {
        this.betriebForm = {
          ...this.betriebForm,
          [field]: value,
        };
      },

      updateBetriebWizardField(field, value) {
        this.betriebWizardForm = {
          ...this.betriebWizardForm,
          [field]: value,
        };
      },

      renderField(label, inputId, field, attrs = {}) {
        return h('div', { class: 'field' }, [
          h('label', { for: inputId }, label),
          h('input', {
            id: inputId,
            value: this.betriebForm[field],
            onInput: event => this.updateBetriebField(field, event.target.value),
            ...attrs,
          }),
        ]);
      },

      renderWizardField(label, inputId, field, attrs = {}) {
        return h('div', { class: 'field' }, [
          h('label', { for: inputId }, label),
          h('input', {
            id: inputId,
            value: this.betriebWizardForm[field],
            onInput: event => this.updateBetriebWizardField(field, event.target.value),
            ...attrs,
          }),
        ]);
      },

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

      renderBetriebTab() {
        return [
          h('h2', [
            '🏡 Betrieb ',
            h('span', { class: 'badge' }, 'Stammdaten'),
          ]),
          h('div', { class: 'card' }, [
            h('div', { class: 'form-grid cols-3' }, [
              this.renderField('Firma', 'b-firma', 'firma'),
              this.renderField('Nachname', 'b-name', 'name'),
              this.renderField('Vorname', 'b-vorname', 'vorname'),
              this.renderField('Straße + Hausnr.', 'b-strHnr', 'strHnr'),
              this.renderField('PLZ', 'b-plz', 'plz'),
              this.renderField('Ort', 'b-ort', 'ort'),
              h('div', { class: 'field' }, [
                h('label', { for: 'b-bundesland' }, 'Bundesland'),
                h('select', {
                  id: 'b-bundesland',
                  value: this.betriebForm.bundesland,
                  onChange: event => this.updateBetriebField('bundesland', event.target.value),
                }, bundeslandOptions.map(([value, label]) => (
                  h('option', { value }, label)
                ))),
              ]),
            ]),
            h('div', { class: 'mt-1 flex-end' }, [
              h('button', {
                type: 'button',
                class: 'btn btn-primary',
                disabled: this.isBetriebSaving,
                onClick: () => this.saveBetrieb(),
              }, this.isBetriebSaving ? 'Speichert...' : '💾 Speichern'),
            ]),
          ]),
        ];
      },

      renderBetriebWizard() {
        const localSave = this.betriebWizardForm.localSave;

        return h('div', { class: 'modal' }, [
          h('h3', 'Willkommen 👋'),
          h('p', { class: 'modal-note' }, 'Bevor du loslegst, trage bitte einmal die Betriebsdaten ein.'),
          h('div', { class: 'form-grid cols-3' }, [
            this.renderWizardField('Firma', 'wiz-firma', 'firma', { placeholder: 'Mustermann Gemüsebau' }),
            this.renderWizardField('Nachname', 'wiz-name', 'name', { placeholder: 'Mustermann' }),
            this.renderWizardField('Vorname', 'wiz-vorname', 'vorname', { placeholder: 'Max' }),
            this.renderWizardField('Straße + Hausnr.', 'wiz-strHnr', 'strHnr', { placeholder: 'Musterstraße 123' }),
            this.renderWizardField('PLZ', 'wiz-plz', 'plz', { placeholder: '12345' }),
            this.renderWizardField('Ort', 'wiz-ort', 'ort', { placeholder: 'Musterstadt' }),
            h('div', { class: 'field' }, [
              h('label', { for: 'wiz-bundesland' }, 'Bundesland'),
              h('select', {
                id: 'wiz-bundesland',
                value: this.betriebWizardForm.bundesland,
                onChange: event => this.updateBetriebWizardField('bundesland', event.target.value),
              }, bundeslandOptions.map(([value, label]) => h('option', { value }, label))),
            ]),
            this.renderWizardField(
              'Anwendungsverantwortlicher',
              'wiz-anwendungsverantwortlicher',
              'verantwortlicher',
              { placeholder: 'Max Mustermann' },
            ),
            this.renderWizardField('Anwender', 'wiz-anwender', 'anwender', { placeholder: 'Max Mustermann' }),
          ]),
          h('div', { class: 'wizard-settings-box' }, [
            h('div', { class: 'wizard-settings-title' }, '📁 Speicher-Einstellung'),
            h('div', { class: 'settings-row' }, [
              h('span', {
                class: ['upper-label', localSave ? 'label-muted' : 'label-inherit'],
                id: 'wiz-lbl-browser',
              }, 'Browser-Download'),
              h('label', {
                class: 'save-toggle',
                title: 'Umschalten zwischen Browser-Download und lokalem Speichern',
              }, [
                h('input', {
                  type: 'checkbox',
                  id: 'wiz-save-mode-toggle',
                  checked: localSave,
                  onChange: event => this.updateBetriebWizardField('localSave', event.target.checked),
                }),
                h('span', { class: 'save-toggle-track' }),
              ]),
              h('span', {
                class: ['upper-label', localSave ? 'label-inherit' : 'label-muted'],
                id: 'wiz-lbl-local',
              }, 'Lokal speichern'),
            ]),
            h('div', {
              class: 'text-muted-sm mt-05',
              id: 'wiz-save-mode-desc',
            }, localSave
              ? 'Datei wird auf dem Server im Exportordner abgelegt'
              : 'Datei wird als ZIP (JSON + PDF) direkt im Browser heruntergeladen'),
          ]),
          h('div', { class: 'modal-footer' }, [
            h('button', {
              type: 'button',
              class: 'btn btn-primary',
              disabled: this.isBetriebWizardSaving,
              onClick: () => this.saveBetriebWizard(),
            }, this.isBetriebWizardSaving ? 'Speichert...' : 'Speichern und starten'),
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
