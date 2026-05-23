import { h, nextTick, Teleport } from 'vue';

import AppShell from '../components/AppShell.vue';
import BeratungView from '../views/BeratungView.vue';
import BetriebView from '../views/BetriebView.vue';
import BetriebWizard from '../components/modals/BetriebWizard.vue';
import FeldMapModal from '../components/modals/EinsatzortMapModal.vue';
import FeldModal from '../components/modals/EinsatzortModal.vue';
import FelderView from '../views/EinsatzorteView.vue';
import ForecastView from '../views/ForecastView.vue';
import HomeView from '../views/HomeView.vue';
import HistoryView from '../views/HistoryView.vue';
import InventoryView from '../views/InventoryView.vue';
import KulturModal from '../components/modals/KulturModal.vue';
import KulturenView from '../views/KulturenView.vue';
import PsmModal from '../components/modals/PsmModal.vue';
import PsmView from '../views/PsmView.vue';
import SettingsView from '../views/SettingsView.vue';
import ExportView from '../views/ExportView.vue';
import { useUiStore } from '../stores/uiStore.js';
import {
  applyDefaultSettingsToExport,
  applyUserSettings,
  setToastHandler,
  updateExportButtons,
} from './appBridge.js';
import { apiDelete, apiGet, apiPost, apiPut } from './api.js';
import {
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
      activeForecastSubTab: 'spritzfenster',
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
      isFelderLoading: false,
      isKulturenLoading: false,
      inventoryWarningCount: 0,
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
      felderItems: [],
      feldEditId: null,
      feldForm: {
        name: '',
        gpsRechtswert: '',
        gpsHochwert: '',
        anwendungsbereich: 'Freiland',
        geoTyp: 'GPS-Koordinaten',
        einheit: 'm2',
        flaecheVolumen: '',
        ort_id: '',
        kultur_id: '',
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
      toastTimer: null,
      removeToastHandler: null,
      uiStore: null,
      user: {
        username: user.username || '',
        avatar: user.avatar || '?',
      },
      versionInfo: {
        appName: 'PSMSimple',
        currentVersion: '',
        latestVersion: '',
        releaseUrl: '',
        updateAvailable: false,
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
    document.getElementById('tab-export')?.replaceChildren();
    document.getElementById('tab-history')?.replaceChildren();
    document.getElementById('tab-forecast')?.replaceChildren();
    document.getElementById('tab-inventory')?.replaceChildren();
    document.getElementById('tab-settings')?.replaceChildren();
    document.getElementById('modal-psm')?.replaceChildren();
    document.getElementById('modal-einsatzort')?.replaceChildren();
    document.getElementById('modal-map')?.replaceChildren();
    document.getElementById('modal-kultur')?.replaceChildren();
    document.getElementById('modal-betrieb-wizard')?.replaceChildren();
  },

  mounted() {
    this.uiStore = useUiStore();
    this.uiStore.setActiveTab(this.activeTab);
    this.uiStore.setUser(this.user);
    this.removeToastHandler = setToastHandler((message, duration = 2600) => this.toast(message, duration));

    this.applyTabClasses();
    this.applyMobileNavClasses();
    this.applyUserPopupClasses();

    document.addEventListener('click', this.onDocumentClick);
    window.addEventListener('resize', this.onResize);

    this.loadBetrieb();
    this.loadPSM();
    this.loadFelder();
    this.loadKulturen();
    this.loadVersionInfo();
  },

  beforeUnmount() {
    this.removeToastHandler?.();
    document.removeEventListener('click', this.onDocumentClick);
    window.removeEventListener('resize', this.onResize);
  },

  watch: {
    '$route.path'(path) {
      const tabName = getTabFromPath(path);
      if (tabName !== this.activeTab) {
        this.showTab(tabName, null, false);
      }
    },
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
        const payload = await apiGet('/api/app/settings');
        if (Array.isArray(payload)) {
          inventoryDefaults = Object.fromEntries(payload.map(item => [item.key, item.value]));
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
      this.openModal('modal-psm');
    },

    async editPSM(id) {
      try {
        const item = await apiGet(`/api/psm/${id}`);
        this.psmEditId = id;
        this.psmSearchResults = [];
        this.showPsmSearchResults = false;
        this.applyPsmForm(item);
        this.openModal('modal-psm');
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
      }
    },

    async savePSM() {
      try {
        if (this.isPsmInfoLoading) {
          this.toast('⚠️ Bitte warten, bis die Daten geladen sind');
          return;
        }

        const payload = this.collectPSMForm();
        if (!payload.name) {
          this.toast('❌ Bitte einen Namen eingeben');
          return;
        }

        if (this.psmEditId) {
          await apiPut(`/api/psm/${this.psmEditId}`, payload);
          this.toast('✅ Pflanzenschutzmittel gespeichert');
        } else {
          try {
            await apiPost('/api/psm', payload);
            this.toast('✅ Pflanzenschutzmittel hinzugefügt');
          } catch (err) {
            if (err.message.includes('existiert bereits')) {
              this.toast('⚠️ Mittel existiert bereits');
            } else {
              throw err;
            }
          }
        }

        this.closeModal('modal-psm');
        await this.resetPSMForm();
        await this.loadPSM();
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
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
        this.psmSearchResults = await apiGet(`/search/psm/${encodeURIComponent(term.trim())}`) || [];
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
        const info = await apiGet(`/api/psm/info/${encodeURIComponent(kennr)}`);
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
        this.toast('⚠️ Wirkstoffdaten konnten nicht geladen werden');
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
        this.isPsmLoading = true;
        this.psmItems = await apiGet('/api/psm');
      } catch (err) {
        console.error(err);
        this.toast('❌ Pflanzenschutzmittel konnten nicht geladen werden');
      } finally {
        this.isPsmLoading = false;
      }
    },

    async loadVersionInfo() {
      try {
        const version = await apiGet('/version');
        this.versionInfo = {
          ...this.versionInfo,
          appName: version.name || this.versionInfo.appName,
          currentVersion: version.version || '',
        };

        try {
          const check = await apiGet('/version/check');
          this.versionInfo = {
            ...this.versionInfo,
            appName: check.app_name || this.versionInfo.appName,
            currentVersion: check.current_version || this.versionInfo.currentVersion,
            latestVersion: check.latest_version || '',
            releaseUrl: check.release_url || '',
            updateAvailable: !!check.update_available,
          };
        } catch (err) {
          console.warn('[loadVersionInfo] Updateprüfung fehlgeschlagen:', err);
        }
      } catch (err) {
        console.warn('[loadVersionInfo] Version konnte nicht geladen werden:', err);
      }
    },

    async removePSM(id) {
      if (!confirm('Dieses Pflanzenschutzmittel wirklich löschen?')) return;

      try {
        await apiDelete(`/api/psm/${id}`);
        this.toast('✅ Pflanzenschutzmittel gelöscht');
        await this.loadPSM();
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
      }
    },

    getOrtNameById(ortId) {
      const ort = this.orteItems.find(item => String(item.id) === String(ortId));
      return ort?.name || ort?.bezeichnung || (ortId ? `Ort #${ortId}` : '-');
    },

    applyFeldForm(item = {}) {
      this.feldForm = {
        name: item.name || '',
        gpsRechtswert: String(item.gpsRechtswert ?? ''),
        gpsHochwert: String(item.gpsHochwert ?? ''),
        anwendungsbereich: item.anwendungsbereich || 'Freiland',
        geoTyp: item.geoTyp || 'GPS-Koordinaten',
        einheit: item.einheit || 'm2',
        flaecheVolumen: String(item.flaecheVolumen ?? ''),
        ort_id: item.ort_id == null ? '' : String(item.ort_id),
        kultur_id: item.kultur_id == null ? '' : String(item.kultur_id),
      };
    },

    collectFeldForm() {
      return {
        name: this.feldForm.name.trim(),
        gpsRechtswert: this.feldForm.gpsRechtswert.trim(),
        gpsHochwert: this.feldForm.gpsHochwert.trim(),
        anwendungsbereich: this.feldForm.anwendungsbereich.trim(),
        geoTyp: this.feldForm.geoTyp.trim(),
        einheit: this.feldForm.einheit.trim(),
        flaecheVolumen: this.feldForm.flaecheVolumen.trim(),
        ort_id: this.feldForm.ort_id,
        kultur_id: this.feldForm.kultur_id,
      };
    },

    updateFeldField(field, value) {
      this.feldForm = {
        ...this.feldForm,
        [field]: value,
      };
    },

    async loadOrte() {
      try {
        const items = await apiGet('/api/orte');
        this.orteItems = Array.isArray(items) ? items : [];
      } catch (err) {
        console.error(err);
        this.toast('❌ Orte konnten nicht geladen werden');
      }
    },

    async loadFelder() {
      try {
        this.isFelderLoading = true;
        await this.loadOrte();
        const items = await apiGet('/api/einsatzorte');
        this.felderItems = Array.isArray(items) ? items : [];
      } catch (err) {
        console.error(err);
        this.toast('❌ Felder konnten nicht geladen werden');
      } finally {
        this.isFelderLoading = false;
      }
    },

    async resetFeldForm() {
      this.feldEditId = null;
      this.applyFeldForm();
      await this.loadOrte();
      this.resetEinsatzortMap();
    },

    async openFeldModal() {
      await this.resetFeldForm();
      this.openModal('modal-einsatzort');
    },

    async editFeld(id) {
      try {
        const item = await apiGet(`/api/einsatzorte/${id}`);
        this.feldEditId = id;
        await this.loadOrte();
        this.applyFeldForm(item);

        const lat = parseFloat(item.gpsRechtswert);
        const lng = parseFloat(item.gpsHochwert);
        this.eoMapSelection = Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };

        this.openModal('modal-einsatzort');
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
      }
    },

    async saveFeld() {
      try {
        const payload = this.collectFeldForm();

        if (!payload.name) {
          this.toast('❌ Bitte einen Namen eingeben');
          return;
        }

        if (!payload.ort_id) {
          this.toast('❌ Bitte einen Ort auswählen');
          return;
        }

        if (this.feldEditId) {
          await apiPut(`/api/einsatzorte/${this.feldEditId}`, payload);
          this.toast('✅ Feld gespeichert');
        } else {
          await apiPost('/api/einsatzorte', payload);
          this.toast('✅ Feld hinzugefügt');
        }

        this.closeModal('modal-einsatzort');
        await this.resetFeldForm();
        await this.loadFelder();
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
      }
    },

    async removeFeld(id) {
      if (!confirm('Dieses Feld wirklich löschen?')) return;

      try {
        await apiDelete(`/api/einsatzorte/${id}`);
        this.toast('✅ Feld gelöscht');
        await this.loadFelder();
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
      }
    },

    async openMapModal() {
      this.openModal('modal-map');
      await nextTick();
      window.setTimeout(() => this.initializeOrRefreshMap(), 80);
    },

    async initializeOrRefreshMap() {
      const leaflet = window.L;
      if (!leaflet) {
        this.toast('❌ Karte konnte nicht geladen werden');
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

      const lat = parseFloat(this.feldForm.gpsRechtswert);
      const lng = parseFloat(this.feldForm.gpsHochwert);
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
        const betrieb = await apiGet('/api/betrieb');
        if (!betrieb?.plz) throw new Error('Keine PLZ gefunden');

        const data = await apiGet(`/api/einsatzorte/cord2plz/${encodeURIComponent(betrieb.plz)}`);
        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lon);

        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          return { center: [lat, lng], zoom: eoMapPointZoom };
        }

        this.toast('❌ PLZ nicht gefunden');
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
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

      this.feldForm = {
        ...this.feldForm,
        gpsRechtswert: String(this.eoMapSelection.lat),
        gpsHochwert: String(this.eoMapSelection.lng),
      };

      this.closeModal('modal-map');
      this.toast('📍 Koordinaten übernommen');
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
        this.isKulturenLoading = true;
        const items = await apiGet('/api/kulturen');
        this.kulturenItems = Array.isArray(items) ? items : [];
      } catch (err) {
        console.error(err);
        this.toast('❌ Kulturen konnten nicht geladen werden');
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
      this.openModal('modal-kultur');
    },

    async editKultur(id) {
      try {
        const item = await apiGet(`/api/kulturen/${id}`);
        this.kulturEditId = id;
        this.applyKulturForm(item);
        this.bbchDraftItems = [];
        this.openModal('modal-kultur');
        await this.loadBBCHForKultur(id);
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message || 'Kultur konnte nicht geladen werden'}`);
      }
    },

    async saveKultur() {
      try {
        const payload = this.collectKulturForm();

        if (!payload.name) {
          this.toast('❌ Bitte einen Namen eingeben');
          return;
        }

        if (!payload.eppoCode) {
          this.toast('❌ Bitte einen EPPO-Code eingeben');
          return;
        }

        if (this.kulturEditId) {
          await apiPut(`/api/kulturen/${this.kulturEditId}`, payload);
          this.toast('✅ Kultur gespeichert');
        } else {
          await apiPost('/api/kulturen', payload);
          this.toast('✅ Kultur hinzugefügt');
        }

        this.closeModal('modal-kultur');
        this.resetKulturForm();
        await this.loadKulturen();
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message || 'Speichern fehlgeschlagen'}`);
      }
    },

    async removeKultur(id) {
      if (!confirm('Diese Kultur wirklich löschen?')) return;

      try {
        await apiDelete(`/api/kulturen/${id}`);
        this.toast('✅ Kultur gelöscht');
        await this.loadKulturen();
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message || 'Löschen fehlgeschlagen'}`);
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
        const items = await apiGet(`/api/bbch/kultur/${kulturId}`);
        this.bbchOverviewItems = Array.isArray(items) ? items.map(item => this.normalizeBBCHItem(item)) : [];
        this.bbchDraftItems = [];
      } catch (err) {
        console.error(err);
        this.bbchOverviewItems = [];
        this.bbchDraftItems = [];
        this.toast('❌ BBCH-Codes konnten nicht geladen werden');
      }
    },

    addBBCHRow() {
      if (!this.kulturEditId) {
        this.toast('❌ Bitte zuerst die Kultur speichern');
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
        this.toast('❌ Bitte zuerst die Kultur speichern');
        return;
      }

      const item = this.bbchDraftItems.find(entry => entry.key === key);
      if (!item) {
        this.toast('❌ BBCH-Zeile nicht gefunden');
        return;
      }

      if (!String(item.code || '').trim()) {
        this.toast('❌ Bitte einen BBCH-Code angeben');
        return;
      }

      if (!String(item.bezeichnung || '').trim()) {
        this.toast('❌ Bitte eine Bezeichnung angeben');
        return;
      }

      try {
        const payload = this.buildBBCHPayload(item, this.kulturEditId);

        if (item.id != null) {
          await apiPut(`/api/bbch/${item.id}`, payload);
        } else {
          await apiPost('/api/bbch', payload);
        }

        await this.loadBBCHForKultur(this.kulturEditId);
        this.toast('✅ BBCH gespeichert');
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message || 'BBCH speichern fehlgeschlagen'}`);
      }
    },

    async deleteBBCHOverview(id) {
      if (!id || !confirm('Diesen BBCH-Eintrag wirklich löschen?')) return;

      try {
        await apiDelete(`/api/bbch/${id}`);
        this.toast('✅ BBCH gelöscht');
        if (this.kulturEditId) await this.loadBBCHForKultur(this.kulturEditId);
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
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
        const betrieb = await apiGet('/api/betrieb');
        if (!betrieb || !betrieb.id) {
          this.betriebExists = false;
          this.openModal('modal-betrieb-wizard');
          return;
        }

        this.betriebExists = true;
        this.applyBetriebForm(betrieb);
      } catch (err) {
        console.error(err);
        this.toast('❌ Betrieb konnte nicht geladen werden');
      }
    },

    async saveBetrieb() {
      try {
        this.isBetriebSaving = true;
        await apiPost('/api/betrieb', this.collectBetriebForm());
        this.betriebExists = true;
        this.toast('✅ Betrieb gespeichert');
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
      } finally {
        this.isBetriebSaving = false;
      }
    },

    async saveBetriebWizard() {
      try {
        this.isBetriebWizardSaving = true;
        const payload = this.collectWizardBetriebForm();
        const wizSaveMode = this.collectWizardSaveMode();

        await apiPost('/api/betrieb', {
          firma: payload.firma,
          name: payload.name,
          vorname: payload.vorname,
          strHnr: payload.strHnr,
          plz: payload.plz,
          ort: payload.ort,
          bundesland: payload.bundesland,
        });

        await apiPost('/api/user/settings', {
          browser_download: wizSaveMode.browser_download,
          local_save: wizSaveMode.local_save,
          default_anwender: payload.anwender,
          default_verantwortlich: payload.verantwortlicher,
        });

        updateExportButtons(wizSaveMode.local_save);
        applyDefaultSettingsToExport({
          default_anwender: payload.anwender,
          default_verantwortlich: payload.verantwortlicher,
        });
        applyUserSettings({
          local_save: wizSaveMode.local_save,
          default_anwender: payload.anwender,
          default_verantwortlich: payload.verantwortlicher,
        });

        this.applyBetriebForm(payload);
        this.betriebExists = true;
        this.closeModal('modal-betrieb-wizard');
        this.toast('✅ Betriebsdaten gespeichert');
      } catch (err) {
        console.error(err);
        this.toast(`❌ ${err.message}`);
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

    showForecastSubTab(subtab) {
      this.activeForecastSubTab = subtab === 'beratung' ? 'beratung' : 'spritzfenster';
    },

    showTab(tabName, el = null, push = true) {
      if (!tabName) return;

      this.activeTab = tabName;
      this.uiStore?.setActiveTab(tabName);
      this.applyTabClasses(el);
      this.closeUserPopup();

      if (window.innerWidth <= 640) {
        this.closeMobileNav();
      }

      if (push) {
        const path = tabToPath[tabName] || '/betrieb';
        if (this.$route?.path !== path) {
          this.$router.push(path);
        }
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

    toast(message, duration = 2600) {
      const el = document.getElementById('toast');
      if (!el) return;

      el.textContent = message;
      el.classList.add('show');

      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        el.classList.remove('show');
      }, duration);
    },

    openModal(id) {
      document.getElementById(id)?.classList.add('open');
    },

    closeModal(id) {
      document.getElementById(id)?.classList.remove('open');
    },

    logout() {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/logout';

      const csrfToken = document.querySelector('meta[name="csrf-token"]');
      if (csrfToken) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = csrfToken.content;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
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
        versionInfo: this.versionInfo,
        inventoryWarningCount: this.inventoryWarningCount,
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
        h(FelderView, {
          canWrite: !!this.permissions.can_write,
          isLoading: this.isFelderLoading,
          items: this.felderItems,
          kulturen: this.kulturenItems,
          orte: this.orteItems,
          onEdit: id => this.editFeld(id),
          onOpenCreate: () => this.openFeldModal(),
          onRemove: id => this.removeFeld(id),
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
      h(Teleport, { to: '#tab-export' }, [
        h(ExportView, {
          psmItems: this.psmItems,
          felderItems: this.felderItems,
          kulturenItems: this.kulturenItems,
          orteItems: this.orteItems,
        }),
      ]),
      h(Teleport, { to: '#tab-forecast' }, [
        h('h2', [
          '📈 Beratung ',
          h('span', { class: 'badge', id: 'forecast-status-badge' }, this.activeForecastSubTab === 'beratung' ? 'PSM-Beratung' : 'Spritzfenster'),
        ]),
        h('div', { class: 'sub-tabs' }, [
          h('button', {
            type: 'button',
            class: ['sub-tab-btn', { active: this.activeForecastSubTab === 'spritzfenster' }],
            onClick: () => this.showForecastSubTab('spritzfenster'),
          }, '🌤 Spritzfenster'),
          h('button', {
            id: 'forecast-subtab-beratung',
            type: 'button',
            class: ['sub-tab-btn', { active: this.activeForecastSubTab === 'beratung' }],
            onClick: () => this.showForecastSubTab('beratung'),
          }, '🤖 PSM-Beratung'),
        ]),
        h('div', {
          id: 'forecast-sub-spritzfenster',
          class: ['history-sub-tab', { active: this.activeForecastSubTab === 'spritzfenster' }],
        }, [
          h(ForecastView),
        ]),
        h('div', {
          id: 'forecast-sub-beratung',
          class: ['history-sub-tab', { active: this.activeForecastSubTab === 'beratung' }],
        }, [
          h(BeratungView),
        ]),
      ]),
      h(Teleport, { to: '#tab-history' }, [
        h(HistoryView, {
          activeTab: this.activeTab,
          canWrite: !!this.permissions.can_write,
        }),
      ]),
      h(Teleport, { to: '#tab-inventory' }, [
        h(InventoryView, {
          activeTab: this.activeTab,
          canWrite: !!this.permissions.can_write,
          onWarningCount: count => {
            this.inventoryWarningCount = count;
            this.uiStore?.setInventoryWarningCount(count);
          },
        }),
      ]),
      h(Teleport, { to: '#tab-settings' }, [
        h(SettingsView, {
          initialUsername: this.user.username,
          permissions: this.permissions,
          onRenameUser: username => {
            this.user = {
              username,
              avatar: username.charAt(0).toUpperCase(),
            };
            this.uiStore?.setUser(this.user);
          },
          onSwitchForecastSubTab: subtab => this.showForecastSubTab(subtab),
        }),
      ]),
      h(Teleport, { to: '#modal-psm' }, [
        h(PsmModal, {
          form: this.psmForm,
          isEditing: !!this.psmEditId,
          isInfoLoading: this.isPsmInfoLoading,
          searchResults: this.psmSearchResults,
          showSearchResults: this.showPsmSearchResults,
          onCancel: () => this.closeModal('modal-psm'),
          onSave: () => this.savePSM(),
          onSearch: term => this.searchPSMAutocomplete(term),
          onSelectSearchResult: item => this.selectPSMSearchResult(item),
          onUpdateField: (field, value) => this.updatePsmField(field, value),
        }),
      ]),
      h(Teleport, { to: '#modal-einsatzort' }, [
        h(FeldModal, {
          form: this.feldForm,
          isEditing: !!this.feldEditId,
          kulturen: this.kulturenItems,
          orte: this.orteItems,
          onCancel: () => this.closeModal('modal-einsatzort'),
          onOpenMap: () => this.openMapModal(),
          onSave: () => this.saveFeld(),
          onUpdateField: (field, value) => this.updateFeldField(field, value),
        }),
      ]),
      h(Teleport, { to: '#modal-map' }, [
        h(FeldMapModal, {
          hasSelection: !!this.eoMapSelection,
          selectedLat: this.eoMapSelection?.lat ?? '-',
          selectedLng: this.eoMapSelection?.lng ?? '-',
          onCancel: () => this.closeModal('modal-map'),
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
          onCancel: () => this.closeModal('modal-kultur'),
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

