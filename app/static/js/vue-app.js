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

  const { createApp, nextTick } = window.Vue;
  const bootstrap = window.PSM_BOOTSTRAP || {};

  const app = createApp({
    template: `
      <div class="nav-items">
        <template v-for="section in navSections" :key="section.label">
          <div v-if="section.label" class="section-label">{{ section.label }}</div>
          <a
            v-for="item in section.items"
            :key="item.tab"
            :href="item.href"
            :data-tab="item.tab"
            :class="{ active: activeTab === item.tab }"
            @click.prevent.stop="openNavItem(item, $event)"
          >
            <span class="ico">{{ item.icon }}</span>
            {{ item.label }}
            <span
              v-if="item.warningBadge"
              class="badge badge-critical hidden"
              id="inventory-warning-count"
            ></span>
          </a>
        </template>
      </div>

      <div class="nav-user">
        <div class="nav-user-popup" id="user-popup">
          <div class="popup-header">
            <div class="popup-label">Angemeldet als</div>
            <div class="popup-username" id="popup-username">{{ user.username }}</div>
            <div class="popup-label">Rolle: {{ permissions.role }}</div>
          </div>

          <a
            href="/settings"
            data-tab="settings"
            class="popup-button-reset"
            @click.prevent.stop="showTab('settings', $event.currentTarget)"
          >
            <span class="ico">⚙️</span>
            <div class="popup-label">Einstellungen</div>
          </a>
          <button type="button" class="popup-button-reset" @click.stop="logout">
            <span class="ico">🚪</span>
            <div class="popup-label">Abmelden</div>
          </button>
        </div>

        <button
          type="button"
          class="nav-user-btn"
          id="user-btn"
          :class="{ open: isUserPopupOpen }"
          @click.stop="toggleUserPopup"
        >
          <div class="nav-user-avatar" id="user-avatar">{{ user.avatar }}</div>
          <span class="nav-user-name" id="user-name-label">{{ user.username }}</span>
          <span class="nav-user-caret">▲</span>
        </button>
      </div>
    `,

    data() {
      const permissions = bootstrap.permissions || {};
      const user = bootstrap.user || {};

      return {
        activeTab: getTabFromPath(),
        isMobileNavOpen: false,
        isUserPopupOpen: false,
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

    methods: {
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
        document.getElementById('nav-overlay')?.classList.toggle('open', this.isMobileNavOpen);
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

  app.mount('#psm-vue-nav');
})();
