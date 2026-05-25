import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';

import { getPrimeVueOptions } from './app/primevueConfig.js';
import './styles/primevue.css';

const LoginApp = {
  data() {
    return {
      activePanel: 'login',
      isMobileNavOpen: false,
    };
  },
  mounted() {
    this.bindDomEvents();

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
      this.showPanelAuth('register');
    } else {
      this.applyDomState();
    }
  },
  methods: {
    bindDomEvents() {
      document.getElementById('login-nav-toggle')?.addEventListener('click', this.toggleMobileNav);
      document.getElementById('nav-overlay')?.addEventListener('click', this.closeMobileNav);

      document.querySelectorAll('[data-panel]').forEach((el) => {
        el.addEventListener('click', (event) => {
          event.preventDefault();
          this.showPanelAuth(el.dataset.panel);
        });
      });
    },
    showPanelAuth(panelName) {
      this.activePanel = panelName || 'login';
      this.closeMobileNav();
      this.applyDomState();
    },
    toggleMobileNav() {
      this.isMobileNavOpen = !this.isMobileNavOpen;
      this.applyDomState();
    },
    closeMobileNav() {
      this.isMobileNavOpen = false;
      this.applyDomState();
    },
    applyDomState() {
      document.getElementById('login-nav')?.classList.toggle('open', this.isMobileNavOpen);
      document.getElementById('nav-overlay')?.classList.toggle('open', this.isMobileNavOpen);

      document.querySelectorAll('[data-panel]').forEach((el) => {
        el.classList.toggle('active', el.dataset.panel === this.activePanel);
      });

      document.querySelectorAll('.auth-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `panel-${this.activePanel}`);
      });
    },
  },
  render() {
    return null;
  },
};

const app = createApp(LoginApp);

app.use(createPinia());
app.use(PrimeVue, getPrimeVueOptions());

app.mount('#login-vue-controller');
