import { h, nextTick, Teleport } from 'vue';

import AppShell from '../components/AppShell.js';
import BetriebView from '../components/BetriebView.js';
import BetriebWizard from '../components/BetriebWizard.js';
import EinsatzortMapModal from '../components/EinsatzortMapModal.js';
import EinsatzortModal from '../components/EinsatzortModal.js';
import EinsatzorteView from '../components/EinsatzorteView.js';
import HomeView from '../components/HomeView.js';
import KulturModal from '../components/KulturModal.js';
import KulturenView from '../components/KulturenView.js';
import PsmModal from '../components/PsmModal.js';
import PsmView from '../components/PsmView.js';
import {
  callIfExists,
  eoMapDefault,
  eoMapDefaultZoom,
  eoMapPointZoom,
  getTabFromPath,
  readBootstrapData,
  tabToPath,
} from './bootstrap.js';

const bootstrap = readBootstrapData();

const AppRoot = {
  data() {
    const permissions = bootstrap.permissions || {};
    const user = bootstrap.user || {};
    const assets = bootstrap.assets || {};

    return {
      activeTab: getTabFromPath(),
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
      isEinsatzorteLoading: false,
      isKulturenLoading: false,
      isMobileNavOpen: false,
      isPsmInfoLoading: false,
      isPsmLoading: false,
      isUserPopupOpen: false,
      permissions,
      psmEditId: null,
      psmForm: {
        name: '',
        zulassungsnr: '',
        wirkstoffe: '',
        aufwandEinheit: '',
        bienen: 'B4',
        lager_einheit: '',
        min_lager: '',
        warnung_lager: '',
      },
      psmItems: [],
      psmSearchResults: [],
      psmSearchTimer: null,
      einsatzorteItems: [],
      einsatzortEditId: null,
      einsatzortForm: {
        name: '',
        gpsRechtswert: '',
        gpsHochwert: '',
        anwendungsbereich: 'Freiland',
        geoTyp: 'GPS-Koordinaten',
        einheit: 'm2',
        flaecheVolumen: '',
        ort_id: '',
      },
      eoMap: null,
      eoMarker: null,
      eoMapSelection: null,
      kulturenItems: [],
      kulturEditId: null,
      kulturForm: {
        name: '',
        eppoCode: '',
      },
      bbchDraftItems: [],
      bbchOverviewItems: [],
      bbchTempRowId: 0,
      orteItems: [],
      showPsmSearchResults: false,
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
          label: 'Betrieb',
          items: [
            { tab: 'betrieb', href: '/betrieb', icon: '🏡', label: 'Betrieb' },
          ],
        },
        {
          label: 'Pflanzenschutz',
          items: [
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
    document.getElementById('tab-psm')?.replaceChildren();
    document.getElementById('tab-einsatzorte')?.replaceChildren();
    document.getElementById('tab-kulturen')?.replaceChildren();
    document.getElementById('modal-psm')?.replaceChildren();
    document.getElementById('modal-einsatzort')?.replaceChildren();
    document.getElementById('modal-map')?.replaceChildren();
    document.getElementById('modal-kultur')?.replaceChildren();
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

    this.loadPSM();
    this.loadEinsatzorte();
    this.loadKulturen();
  },

  beforeUnmount() {
    document.removeEventListener('click', this.onDocumentClick);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('popstate', this.onPopState);
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

    applyPsmForm(item = {}) {
      this.psmForm = {
        name: item.name || '',
        zulassungsnr: item.zulassungsnr || '',
        wirkstoffe: item.wirkstoffe || '',
        aufwandEinheit: item.aufwandEinheit || '',
        bienen: item.bienen || 'B4',
        lager_einheit: String(item.lager_einheit ?? ''),
        min_lager: String(item.min_lager ?? ''),
        warnung_lager: String(item.warnung_lager ?? ''),
      };
    },

    collectPSMForm() {
      return {
        name: this.psmForm.name.trim(),
        zulassungsnr: this.psmForm.zulassungsnr.trim(),
        wirkstoffe: this.psmForm.wirkstoffe.trim(),
        aufwandEinheit: this.psmForm.aufwandEinheit.trim(),
        bienen: this.psmForm.bienen.trim(),
        lager_einheit: this.psmForm.lager_einheit.trim(),
        min_lager: this.psmForm.min_lager.trim(),
        warnung_lager: this.psmForm.warnung_lager.trim(),
      };
    },

    async resetPSMForm() {
      this.psmEditId = null;
      this.isPsmInfoLoading = false;
      this.psmSearchResults = [];
      this.showPsmSearchResults = false;

      let inventoryDefaults = {};
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn === 'function') {
          const payload = await apiGetFn('/api/app/settings');
          if (Array.isArray(payload)) {
            inventoryDefaults = Object.fromEntries(payload.map(item => [item.key, item.value]));
          }
        }
      } catch (err) {
        console.warn('[resetPSMForm] App-Settings konnten nicht geladen werden:', err);
      }

      this.applyPsmForm({
        bienen: 'B4',
        min_lager: inventoryDefaults.inventory_min_default ?? '',
        warnung_lager: inventoryDefaults.inventory_warn_default ?? '',
      });
    },

    async openPSMModal() {
      await this.resetPSMForm();
      callIfExists('openModal', 'modal-psm');
    },

    async editPSM(id) {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        const item = await apiGetFn(`/api/psm/${id}`);
        this.psmEditId = id;
        this.psmSearchResults = [];
        this.showPsmSearchResults = false;
        this.applyPsmForm(item);
        callIfExists('openModal', 'modal-psm');
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
    },

    async savePSM() {
      try {
        if (this.isPsmInfoLoading) {
          callIfExists('toast', '⚠️ Bitte warten, bis die Daten geladen sind');
          return;
        }

        const payload = this.collectPSMForm();
        if (!payload.name) {
          callIfExists('toast', '❌ Bitte einen Namen eingeben');
          return;
        }

        if (this.psmEditId) {
          const apiPutFn = window.apiPut;
          if (typeof apiPutFn !== 'function') return;
          await apiPutFn(`/api/psm/${this.psmEditId}`, payload);
          callIfExists('toast', '✅ Pflanzenschutzmittel gespeichert');
        } else {
          const apiPostFn = window.apiPost;
          if (typeof apiPostFn !== 'function') return;
          try {
            await apiPostFn('/api/psm', payload);
            callIfExists('toast', '✅ Pflanzenschutzmittel hinzugefügt');
          } catch (err) {
            if (err.message.includes('existiert bereits')) {
              callIfExists('toast', '⚠️ Mittel existiert bereits');
            } else {
              throw err;
            }
          }
        }

        callIfExists('closeModal', 'modal-psm');
        await this.resetPSMForm();
        await this.loadPSM();
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
    },

    searchPSMAutocomplete(term) {
      clearTimeout(this.psmSearchTimer);
      this.psmSearchTimer = setTimeout(() => this.fetchPSMSearchResults(term), 100);
    },

    async fetchPSMSearchResults(term) {
      if (!term || term.trim().length < 2) {
        this.psmSearchResults = [];
        this.showPsmSearchResults = false;
        return;
      }

      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        this.psmSearchResults = await apiGetFn(`/search/psm/${encodeURIComponent(term.trim())}`) || [];
        this.showPsmSearchResults = true;
      } catch (err) {
        console.error(err);
        this.psmSearchResults = [];
        this.showPsmSearchResults = true;
      }
    },

    async selectPSMSearchResult(item) {
      const name = item.name || '';
      const kennr = item.kennr || item.zulassungsnr || '';
      this.updatePsmField('name', name);
      this.updatePsmField('zulassungsnr', kennr);
      this.showPsmSearchResults = false;

      this.isPsmInfoLoading = true;
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        const info = await apiGetFn(`/api/psm/info/${encodeURIComponent(kennr)}`);
        const beeClass = (info.bienenfreundlichkeit || '').split(',')[0].trim();
        const effortUnit = info.aufwand_einheit || '';
        const [lagerEinheit] = effortUnit.split('/');

        this.psmForm = {
          ...this.psmForm,
          zulassungsnr: info.zulassungsnr || kennr,
          wirkstoffe: info.wirkstoffe || '',
          bienen: ['B1', 'B2', 'B3', 'B4'].includes(beeClass) ? beeClass : this.psmForm.bienen,
          aufwandEinheit: effortUnit,
          lager_einheit: lagerEinheit || this.psmForm.lager_einheit,
        };
      } catch (err) {
        console.error(err);
        callIfExists('toast', '⚠️ Wirkstoffdaten konnten nicht geladen werden');
      } finally {
        this.isPsmInfoLoading = false;
      }
    },

    updatePsmField(field, value) {
      this.psmForm = {
        ...this.psmForm,
        [field]: value,
      };
    },

    async loadPSM() {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        this.isPsmLoading = true;
        this.psmItems = await apiGetFn('/api/psm');
        callIfExists('loadExportSelections');
      } catch (err) {
        console.error(err);
        callIfExists('toast', '❌ Pflanzenschutzmittel konnten nicht geladen werden');
      } finally {
        this.isPsmLoading = false;
      }
    },

    async removePSM(id) {
      if (!confirm('Dieses Pflanzenschutzmittel wirklich löschen?')) return;

      try {
        const apiDeleteFn = window.apiDelete;
        if (typeof apiDeleteFn !== 'function') return;

        await apiDeleteFn(`/api/psm/${id}`);
        callIfExists('toast', '✅ Pflanzenschutzmittel gelöscht');
        await this.loadPSM();
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
    },

    getOrtNameById(ortId) {
      const ort = this.orteItems.find(item => String(item.id) === String(ortId));
      return ort?.name || ort?.bezeichnung || (ortId ? `Ort #${ortId}` : '-');
    },

    applyEinsatzortForm(item = {}) {
      this.einsatzortForm = {
        name: item.name || '',
        gpsRechtswert: String(item.gpsRechtswert ?? ''),
        gpsHochwert: String(item.gpsHochwert ?? ''),
        anwendungsbereich: item.anwendungsbereich || 'Freiland',
        geoTyp: item.geoTyp || 'GPS-Koordinaten',
        einheit: item.einheit || 'm2',
        flaecheVolumen: String(item.flaecheVolumen ?? ''),
        ort_id: item.ort_id == null ? '' : String(item.ort_id),
      };
    },

    collectEinsatzortForm() {
      return {
        name: this.einsatzortForm.name.trim(),
        gpsRechtswert: this.einsatzortForm.gpsRechtswert.trim(),
        gpsHochwert: this.einsatzortForm.gpsHochwert.trim(),
        anwendungsbereich: this.einsatzortForm.anwendungsbereich.trim(),
        geoTyp: this.einsatzortForm.geoTyp.trim(),
        einheit: this.einsatzortForm.einheit.trim(),
        flaecheVolumen: this.einsatzortForm.flaecheVolumen.trim(),
        ort_id: this.einsatzortForm.ort_id,
      };
    },

    updateEinsatzortField(field, value) {
      this.einsatzortForm = {
        ...this.einsatzortForm,
        [field]: value,
      };
    },

    async loadOrte() {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        const items = await apiGetFn('/api/orte');
        this.orteItems = Array.isArray(items) ? items : [];
      } catch (err) {
        console.error(err);
        callIfExists('toast', '❌ Orte konnten nicht geladen werden');
      }
    },

    async loadEinsatzorte() {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        this.isEinsatzorteLoading = true;
        await this.loadOrte();
        const items = await apiGetFn('/api/einsatzorte');
        this.einsatzorteItems = Array.isArray(items) ? items : [];
        callIfExists('loadExportSelections');
      } catch (err) {
        console.error(err);
        callIfExists('toast', '❌ Einsatzorte konnten nicht geladen werden');
      } finally {
        this.isEinsatzorteLoading = false;
      }
    },

    async resetEinsatzortForm() {
      this.einsatzortEditId = null;
      this.applyEinsatzortForm();
      await this.loadOrte();
      this.resetEinsatzortMap();
    },

    async openEinsatzortModal() {
      await this.resetEinsatzortForm();
      callIfExists('openModal', 'modal-einsatzort');
    },

    async editEinsatzort(id) {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        const item = await apiGetFn(`/api/einsatzorte/${id}`);
        this.einsatzortEditId = id;
        await this.loadOrte();
        this.applyEinsatzortForm(item);

        const lat = parseFloat(item.gpsRechtswert);
        const lng = parseFloat(item.gpsHochwert);
        this.eoMapSelection = Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };

        callIfExists('openModal', 'modal-einsatzort');
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
    },

    async saveEinsatzort() {
      try {
        const payload = this.collectEinsatzortForm();

        if (!payload.name) {
          callIfExists('toast', '❌ Bitte einen Namen eingeben');
          return;
        }

        if (!payload.ort_id) {
          callIfExists('toast', '❌ Bitte einen Ort auswählen');
          return;
        }

        if (this.einsatzortEditId) {
          const apiPutFn = window.apiPut;
          if (typeof apiPutFn !== 'function') return;
          await apiPutFn(`/api/einsatzorte/${this.einsatzortEditId}`, payload);
          callIfExists('toast', '✅ Einsatzort gespeichert');
        } else {
          const apiPostFn = window.apiPost;
          if (typeof apiPostFn !== 'function') return;
          await apiPostFn('/api/einsatzorte', payload);
          callIfExists('toast', '✅ Einsatzort hinzugefügt');
        }

        callIfExists('closeModal', 'modal-einsatzort');
        await this.resetEinsatzortForm();
        await this.loadEinsatzorte();
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
    },

    async removeEinsatzort(id) {
      if (!confirm('Diesen Einsatzort wirklich löschen?')) return;

      try {
        const apiDeleteFn = window.apiDelete;
        if (typeof apiDeleteFn !== 'function') return;

        await apiDeleteFn(`/api/einsatzorte/${id}`);
        callIfExists('toast', '✅ Einsatzort gelöscht');
        await this.loadEinsatzorte();
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
    },

    async openMapModal() {
      callIfExists('openModal', 'modal-map');
      await nextTick();
      window.setTimeout(() => this.initializeOrRefreshMap(), 80);
    },

    async initializeOrRefreshMap() {
      const leaflet = window.L;
      if (!leaflet) {
        callIfExists('toast', '❌ Karte konnte nicht geladen werden');
        return;
      }

      if (!this.eoMap) {
        this.configureLeafletMarkerAssets(leaflet);
        const { center, zoom } = await this.getInitialMapView();
        this.eoMap = leaflet.map('eo-map', { zoomControl: true }).setView(center, zoom);

        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(this.eoMap);

        this.eoMap.on('click', event => this.setMapPoint(event.latlng.lat, event.latlng.lng));
      }

      this.eoMap.invalidateSize();

      const lat = parseFloat(this.einsatzortForm.gpsRechtswert);
      const lng = parseFloat(this.einsatzortForm.gpsHochwert);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        this.setMapPoint(lat, lng);
      } else if (this.eoMapSelection) {
        this.setMapPoint(this.eoMapSelection.lat, this.eoMapSelection.lng);
      }
    },

    configureLeafletMarkerAssets(leaflet) {
      if (!leaflet?.Icon?.Default || leaflet.Icon.Default.prototype._psmSimpleConfigured) return;

      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: '/media/marker-icon-2x.png',
        iconUrl: '/media/marker-icon.png',
        shadowUrl: '/media/marker-shadow.png',
      });
      leaflet.Icon.Default.prototype._psmSimpleConfigured = true;
    },

    async getInitialMapView() {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return { center: eoMapDefault, zoom: eoMapDefaultZoom };

        const betrieb = await apiGetFn('/api/betrieb');
        if (!betrieb?.plz) throw new Error('Keine PLZ gefunden');

        const data = await apiGetFn(`/api/einsatzorte/cord2plz/${encodeURIComponent(betrieb.plz)}`);
        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lon);

        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          return { center: [lat, lng], zoom: eoMapPointZoom };
        }

        callIfExists('toast', '❌ PLZ nicht gefunden');
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }

      return { center: eoMapDefault, zoom: eoMapDefaultZoom };
    },

    setMapPoint(lat, lng) {
      if (!this.eoMap) return;

      const leaflet = window.L;
      const latRounded = parseFloat(lat.toFixed(6));
      const lngRounded = parseFloat(lng.toFixed(6));
      this.eoMapSelection = { lat: latRounded, lng: lngRounded };

      if (this.eoMarker) {
        this.eoMarker.setLatLng([latRounded, lngRounded]);
      } else if (leaflet) {
        this.eoMarker = leaflet.marker([latRounded, lngRounded], { draggable: true }).addTo(this.eoMap);
        this.eoMarker.on('dragend', (event) => {
          const point = event.target.getLatLng();
          this.setMapPoint(point.lat, point.lng);
        });
      }

      this.eoMap.setView([latRounded, lngRounded], Math.max(this.eoMap.getZoom(), eoMapPointZoom));
    },

    confirmMapSelection() {
      if (!this.eoMapSelection) return;

      this.einsatzortForm = {
        ...this.einsatzortForm,
        gpsRechtswert: String(this.eoMapSelection.lat),
        gpsHochwert: String(this.eoMapSelection.lng),
      };

      callIfExists('closeModal', 'modal-map');
      callIfExists('toast', '📍 Koordinaten übernommen');
    },

    resetEinsatzortMap() {
      if (this.eoMarker) {
        this.eoMarker.remove();
        this.eoMarker = null;
      }

      this.eoMapSelection = null;

      if (this.eoMap) {
        this.eoMap.setView(eoMapDefault, eoMapDefaultZoom);
      }
    },

    applyKulturForm(item = {}) {
      this.kulturForm = {
        name: item.name || '',
        eppoCode: item.eppoCode || '',
      };
    },

    collectKulturForm() {
      return {
        name: this.kulturForm.name.trim(),
        eppoCode: this.kulturForm.eppoCode.trim(),
      };
    },

    updateKulturField(field, value) {
      this.kulturForm = {
        ...this.kulturForm,
        [field]: value,
      };
    },

    async loadKulturen() {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        this.isKulturenLoading = true;
        const items = await apiGetFn('/api/kulturen');
        this.kulturenItems = Array.isArray(items) ? items : [];
        callIfExists('loadExportSelections');
      } catch (err) {
        console.error(err);
        callIfExists('toast', '❌ Kulturen konnten nicht geladen werden');
      } finally {
        this.isKulturenLoading = false;
      }
    },

    resetKulturForm() {
      this.kulturEditId = null;
      this.applyKulturForm();
      this.bbchDraftItems = [];
      this.bbchOverviewItems = [];
      this.bbchTempRowId = 0;
    },

    openKulturModal() {
      this.resetKulturForm();
      callIfExists('openModal', 'modal-kultur');
    },

    async editKultur(id) {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        const item = await apiGetFn(`/api/kulturen/${id}`);
        this.kulturEditId = id;
        this.applyKulturForm(item);
        this.bbchDraftItems = [];
        callIfExists('openModal', 'modal-kultur');
        await this.loadBBCHForKultur(id);
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message || 'Kultur konnte nicht geladen werden'}`);
      }
    },

    async saveKultur() {
      try {
        const payload = this.collectKulturForm();

        if (!payload.name) {
          callIfExists('toast', '❌ Bitte einen Namen eingeben');
          return;
        }

        if (!payload.eppoCode) {
          callIfExists('toast', '❌ Bitte einen EPPO-Code eingeben');
          return;
        }

        if (this.kulturEditId) {
          const apiPutFn = window.apiPut;
          if (typeof apiPutFn !== 'function') return;
          await apiPutFn(`/api/kulturen/${this.kulturEditId}`, payload);
          callIfExists('toast', '✅ Kultur gespeichert');
        } else {
          const apiPostFn = window.apiPost;
          if (typeof apiPostFn !== 'function') return;
          await apiPostFn('/api/kulturen', payload);
          callIfExists('toast', '✅ Kultur hinzugefügt');
        }

        callIfExists('closeModal', 'modal-kultur');
        this.resetKulturForm();
        await this.loadKulturen();
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message || 'Speichern fehlgeschlagen'}`);
      }
    },

    async removeKultur(id) {
      if (!confirm('Diese Kultur wirklich löschen?')) return;

      try {
        const apiDeleteFn = window.apiDelete;
        if (typeof apiDeleteFn !== 'function') return;

        await apiDeleteFn(`/api/kulturen/${id}`);
        callIfExists('toast', '✅ Kultur gelöscht');
        await this.loadKulturen();
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message || 'Löschen fehlgeschlagen'}`);
      }
    },

    getBBCHKey(item) {
      return item.id != null ? `id-${item.id}` : item.key;
    },

    normalizeBBCHItem(item = {}) {
      const key = item.key || item.tempId || `tmp-${++this.bbchTempRowId}`;

      return {
        id: item.id ?? null,
        key,
        kultur_id: item.kultur_id ?? this.kulturEditId ?? null,
        code: String(item.code ?? '').trim(),
        bezeichnung: String(item.bezeichnung ?? '').trim(),
        beschreibung: String(item.beschreibung ?? '').trim(),
        sortierung: item.sortierung == null || item.sortierung === '' ? '' : String(item.sortierung),
        sortierungManuell: Boolean(item.sortierungManuell),
      };
    },

    sortBBCHItems(items) {
      return [...items].sort((a, b) => {
        const aSort = a.sortierung === '' || a.sortierung == null ? Number.MAX_SAFE_INTEGER : Number(a.sortierung);
        const bSort = b.sortierung === '' || b.sortierung == null ? Number.MAX_SAFE_INTEGER : Number(b.sortierung);
        return aSort - bSort;
      });
    },

    buildBBCHPayload(item, kulturId) {
      return {
        kultur_id: kulturId,
        code: String(item.code || '').trim(),
        bezeichnung: String(item.bezeichnung || '').trim(),
        beschreibung: String(item.beschreibung || '').trim(),
        sortierung: item.sortierung === '' ? null : Number(item.sortierung),
      };
    },

    async loadBBCHForKultur(kulturId) {
      try {
        const apiGetFn = window.apiGet;
        if (typeof apiGetFn !== 'function') return;

        const items = await apiGetFn(`/api/bbch/kultur/${kulturId}`);
        this.bbchOverviewItems = Array.isArray(items) ? items.map(item => this.normalizeBBCHItem(item)) : [];
        this.bbchDraftItems = [];
      } catch (err) {
        console.error(err);
        this.bbchOverviewItems = [];
        this.bbchDraftItems = [];
        callIfExists('toast', '❌ BBCH-Codes konnten nicht geladen werden');
      }
    },

    addBBCHRow() {
      if (!this.kulturEditId) {
        callIfExists('toast', '❌ Bitte zuerst die Kultur speichern');
        return;
      }

      this.bbchDraftItems = [
        ...this.bbchDraftItems,
        this.normalizeBBCHItem({ code: '', bezeichnung: '', beschreibung: '', sortierung: '' }),
      ];
    },

    removeBBCHRow(key) {
      this.bbchDraftItems = this.bbchDraftItems.filter(item => item.key !== key);
    },

    updateBBCHDraftField(key, field, value) {
      this.bbchDraftItems = this.bbchDraftItems.map((item) => {
        if (item.key !== key) return item;

        const updated = {
          ...item,
          [field]: value,
        };

        if (field === 'sortierung') {
          const codeValue = String(updated.code ?? '').trim();
          const sortValue = String(value ?? '').trim();
          updated.sortierungManuell = sortValue !== '' && sortValue !== codeValue;
        }

        if (field === 'code' && !updated.sortierungManuell) {
          updated.sortierung = String(value ?? '').trim();
        }

        return updated;
      });
    },

    async saveSingleBBCHRow(key) {
      if (!this.kulturEditId) {
        callIfExists('toast', '❌ Bitte zuerst die Kultur speichern');
        return;
      }

      const item = this.bbchDraftItems.find(entry => entry.key === key);
      if (!item) {
        callIfExists('toast', '❌ BBCH-Zeile nicht gefunden');
        return;
      }

      if (!String(item.code || '').trim()) {
        callIfExists('toast', '❌ Bitte einen BBCH-Code angeben');
        return;
      }

      if (!String(item.bezeichnung || '').trim()) {
        callIfExists('toast', '❌ Bitte eine Bezeichnung angeben');
        return;
      }

      try {
        const apiPostFn = window.apiPost;
        const apiPutFn = window.apiPut;
        const payload = this.buildBBCHPayload(item, this.kulturEditId);

        if (item.id != null) {
          if (typeof apiPutFn !== 'function') return;
          await apiPutFn(`/api/bbch/${item.id}`, payload);
        } else {
          if (typeof apiPostFn !== 'function') return;
          await apiPostFn('/api/bbch', payload);
        }

        await this.loadBBCHForKultur(this.kulturEditId);
        callIfExists('toast', '✅ BBCH gespeichert');
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message || 'BBCH speichern fehlgeschlagen'}`);
      }
    },

    async deleteBBCHOverview(id) {
      if (!id || !confirm('Diesen BBCH-Eintrag wirklich löschen?')) return;

      try {
        const apiDeleteFn = window.apiDelete;
        if (typeof apiDeleteFn !== 'function') return;

        await apiDeleteFn(`/api/bbch/${id}`);
        callIfExists('toast', '✅ BBCH gelöscht');
        if (this.kulturEditId) await this.loadBBCHForKultur(this.kulturEditId);
      } catch (err) {
        console.error(err);
        callIfExists('toast', `❌ ${err.message}`);
      }
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

  render() {
    return [
      h(AppShell, {
        activeTab: this.activeTab,
        isMobileNavOpen: this.isMobileNavOpen,
        isUserPopupOpen: this.isUserPopupOpen,
        navSections: this.navSections,
        permissions: this.permissions,
        user: this.user,
        onCloseMobileNav: () => this.closeMobileNav(),
        onLogout: () => this.logout(),
        onOpenTab: (tabName, el) => this.showTab(tabName, el),
        onToggleMobileNav: () => this.toggleMobileNav(),
        onToggleUserPopup: () => this.toggleUserPopup(),
      }),
      h(Teleport, { to: '#tab-home' }, [
        h(HomeView, {
          logoUrl: this.assets.logo || '',
          onOpenTab: (tabName, el) => this.showTab(tabName, el),
        }),
      ]),
      h(Teleport, { to: '#tab-betrieb' }, [
        h(BetriebView, {
          form: this.betriebForm,
          isSaving: this.isBetriebSaving,
          onSave: () => this.saveBetrieb(),
          onUpdateField: (field, value) => this.updateBetriebField(field, value),
        }),
      ]),
      h(Teleport, { to: '#tab-psm' }, [
        h(PsmView, {
          canWrite: !!this.permissions.can_write,
          isLoading: this.isPsmLoading,
          items: this.psmItems,
          onEdit: id => this.editPSM(id),
          onOpenCreate: () => this.openPSMModal(),
          onRemove: id => this.removePSM(id),
        }),
      ]),
      h(Teleport, { to: '#tab-einsatzorte' }, [
        h(EinsatzorteView, {
          canWrite: !!this.permissions.can_write,
          isLoading: this.isEinsatzorteLoading,
          items: this.einsatzorteItems,
          orte: this.orteItems,
          onEdit: id => this.editEinsatzort(id),
          onOpenCreate: () => this.openEinsatzortModal(),
          onRemove: id => this.removeEinsatzort(id),
        }),
      ]),
      h(Teleport, { to: '#tab-kulturen' }, [
        h(KulturenView, {
          canWrite: !!this.permissions.can_write,
          isLoading: this.isKulturenLoading,
          items: this.kulturenItems,
          onEdit: id => this.editKultur(id),
          onOpenCreate: () => this.openKulturModal(),
          onRemove: id => this.removeKultur(id),
        }),
      ]),
      h(Teleport, { to: '#modal-psm' }, [
        h(PsmModal, {
          form: this.psmForm,
          isEditing: !!this.psmEditId,
          isInfoLoading: this.isPsmInfoLoading,
          searchResults: this.psmSearchResults,
          showSearchResults: this.showPsmSearchResults,
          onCancel: () => callIfExists('closeModal', 'modal-psm'),
          onSave: () => this.savePSM(),
          onSearch: term => this.searchPSMAutocomplete(term),
          onSelectSearchResult: item => this.selectPSMSearchResult(item),
          onUpdateField: (field, value) => this.updatePsmField(field, value),
        }),
      ]),
      h(Teleport, { to: '#modal-einsatzort' }, [
        h(EinsatzortModal, {
          form: this.einsatzortForm,
          isEditing: !!this.einsatzortEditId,
          orte: this.orteItems,
          onCancel: () => callIfExists('closeModal', 'modal-einsatzort'),
          onOpenMap: () => this.openMapModal(),
          onSave: () => this.saveEinsatzort(),
          onUpdateField: (field, value) => this.updateEinsatzortField(field, value),
        }),
      ]),
      h(Teleport, { to: '#modal-map' }, [
        h(EinsatzortMapModal, {
          hasSelection: !!this.eoMapSelection,
          selectedLat: this.eoMapSelection?.lat ?? '-',
          selectedLng: this.eoMapSelection?.lng ?? '-',
          onCancel: () => callIfExists('closeModal', 'modal-map'),
          onConfirm: () => this.confirmMapSelection(),
        }),
      ]),
      h(Teleport, { to: '#modal-kultur' }, [
        h(KulturModal, {
          form: this.kulturForm,
          isEditing: !!this.kulturEditId,
          bbchDrafts: this.bbchDraftItems,
          bbchOverview: this.bbchOverviewItems,
          onAddBbchRow: () => this.addBBCHRow(),
          onCancel: () => callIfExists('closeModal', 'modal-kultur'),
          onDeleteBbchOverview: id => this.deleteBBCHOverview(id),
          onRemoveBbchRow: key => this.removeBBCHRow(key),
          onSave: () => this.saveKultur(),
          onSaveBbchRow: key => this.saveSingleBBCHRow(key),
          onUpdateBbchField: (key, field, value) => this.updateBBCHDraftField(key, field, value),
          onUpdateField: (field, value) => this.updateKulturField(field, value),
        }),
      ]),
      h(Teleport, { to: '#modal-betrieb-wizard' }, [
        h(BetriebWizard, {
          form: this.betriebWizardForm,
          isSaving: this.isBetriebWizardSaving,
          onSave: () => this.saveBetriebWizard(),
          onUpdateField: (field, value) => this.updateBetriebWizardField(field, value),
        }),
      ]),
    ];
  },
};

export default AppRoot;
