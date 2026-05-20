import { createApp } from 'vue';

const LoginApp = {
  data() {
    return {
      activePanel: 'login',
      isMobileNavOpen: false,
    };
  },
  mounted() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
      this.showPanelAuth('register');
    }

    document.addEventListener('click', this.handleDocumentClick);
    this.updateNavActive();
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleDocumentClick);
  },
  methods: {
    handleDocumentClick(event) {
      const el = event.target.closest('[data-action]');
      if (!el) return;

      const action = el.dataset.action;
      if (action === 'toggleMobileNav') {
        event.preventDefault();
        this.toggleMobileNav();
        return;
      }

      if (action === 'closeMobileNav') {
        event.preventDefault();
        this.closeMobileNav();
        return;
      }

      if (action === 'showPanelAuth') {
        event.preventDefault();
        this.showPanelAuth(el.dataset.panel);
      }
    },
    showPanelAuth(panelName) {
      this.activePanel = panelName || 'login';
      this.closeMobileNav();
      this.updateNavActive();
    },
    toggleMobileNav() {
      this.isMobileNavOpen = !this.isMobileNavOpen;
      const nav = document.querySelector('nav');
      const overlay = document.getElementById('nav-overlay');
      if (!nav || !overlay) return;

      const open = this.isMobileNavOpen;
      nav.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
    },
    closeMobileNav() {
      this.isMobileNavOpen = false;
      const nav = document.querySelector('nav');
      const overlay = document.getElementById('nav-overlay');
      if (!nav || !overlay) return;

      nav.classList.remove('open');
      overlay.classList.remove('open');
    },
    updateNavActive() {
      document.querySelectorAll('nav a').forEach((link) => {
        const targetPanel = link.dataset.panel;
        if (targetPanel) {
          link.classList.toggle('active', targetPanel === this.activePanel);
        }
      });

      document.querySelectorAll('.auth-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `panel-${this.activePanel}`);
      });
    },
  },
};

createApp(LoginApp).mount('#login-vue-app');
