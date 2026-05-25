<template>
  <Teleport to="#psm-vue-header">
    <Button
      id="nav-toggle"
      type="button"
      class="nav-toggle p-button-secondary"
      :aria-label="isMobileNavOpen ? 'Menü schließen' : 'Menü öffnen'"
      label="☰"
      @click.stop="$emit('toggle-mobile-nav')"
    />
    <div class="logo">
      🌿 Pflanzen<span>schutz</span>
    </div>
    <div class="sub">Dokumentation &amp; JSON-Export</div>
    <a
      id="app-version-badge"
      class="version-badge"
      :class="{ 'has-update': versionInfo.updateAvailable, hidden: !versionInfo.currentVersion }"
      :href="versionInfo.releaseUrl || null"
      :target="versionInfo.releaseUrl ? '_blank' : null"
      :rel="versionInfo.releaseUrl ? 'noopener noreferrer' : null"
      :aria-label="versionAriaLabel"
    >
      <span id="app-version-label">{{ versionLabel }}</span>
      <span
        id="app-version-update"
        class="version-update"
        :class="{ hidden: !versionInfo.updateAvailable || !versionInfo.latestVersion }"
      >
        Update verfügbar (v{{ versionInfo.latestVersion }})
      </span>
    </a>
  </Teleport>

  <Teleport to="#psm-vue-overlay">
    <Button
      type="button"
      class="nav-overlay-button"
      aria-label="Menü schließen"
      @click="$emit('close-mobile-nav')"
    />
  </Teleport>

  <Teleport to="#psm-vue-nav">
    <div class="nav-items">
      <template v-for="section in navSections" :key="section.label || 'main'">
        <div v-if="section.label" class="section-label">{{ section.label }}</div>
        <a
          v-for="item in section.items"
          :key="item.tab"
          :href="item.href"
          :data-tab="item.tab"
          :class="{ active: activeTab === item.tab }"
          @click.prevent.stop="$emit('open-tab', item.tab, $event.currentTarget)"
        >
          <span class="ico">{{ item.icon }}</span>
          {{ item.label }}
          <span
            v-if="item.warningBadge"
            id="inventory-warning-count"
            class="badge badge-critical"
            :class="{ hidden: inventoryWarningCount === 0 }"
          >
            {{ inventoryWarningCount > 0 ? String(inventoryWarningCount) : '' }}
          </span>
        </a>
      </template>
    </div>

    <div class="nav-user">
      <div id="user-popup" class="nav-user-popup" :class="{ open: isUserPopupOpen }">
        <div class="popup-header">
          <div class="popup-label">Angemeldet als</div>
          <div id="popup-username" class="popup-username">{{ user.username }}</div>
          <div class="popup-label">Rolle: {{ permissions.role || '' }}</div>
        </div>
        <a
          href="/settings"
          data-tab="settings"
          class="popup-button-reset"
          @click.prevent.stop="$emit('open-tab', 'settings', $event.currentTarget)"
        >
          <span class="ico">⚙️</span>
          <div class="popup-label">Einstellungen</div>
        </a>
        <Button
          type="button"
          class="popup-button-reset p-button-secondary"
          @click.stop="$emit('logout')"
        >
          <span class="ico">🚪</span>
          <div class="popup-label">Abmelden</div>
        </Button>
      </div>

      <Button
        id="user-btn"
        type="button"
        class="nav-user-btn p-button-secondary"
        :class="{ open: isUserPopupOpen }"
        @click.stop="$emit('toggle-user-popup')"
      >
        <div id="user-avatar" class="nav-user-avatar">{{ user.avatar }}</div>
        <span id="user-name-label" class="nav-user-name">{{ user.username }}</span>
        <span class="nav-user-caret">▲</span>
      </Button>
    </div>
  </Teleport>
</template>

<script>
import Button from 'primevue/button';

export default {
  name: 'AppShell',
  components: {
    Button,
  },
  props: {
    activeTab: { type: String, required: true },
    isMobileNavOpen: { type: Boolean, default: false },
    isUserPopupOpen: { type: Boolean, default: false },
    navSections: { type: Array, required: true },
    permissions: { type: Object, required: true },
    user: { type: Object, required: true },
    versionInfo: {
      type: Object,
      default: () => ({
        appName: 'PSMSimple',
        currentVersion: '',
        latestVersion: '',
        releaseUrl: '',
        updateAvailable: false,
      }),
    },
    inventoryWarningCount: { type: Number, default: 0 },
  },
  emits: ['close-mobile-nav', 'logout', 'open-tab', 'toggle-mobile-nav', 'toggle-user-popup'],
  computed: {
    versionLabel() {
      const appName = this.versionInfo.appName || 'PSMSimple';
      return this.versionInfo.currentVersion ? `${appName} v${this.versionInfo.currentVersion}` : appName;
    },
    versionAriaLabel() {
      if (this.versionInfo.updateAvailable && this.versionInfo.latestVersion) {
        return `${this.versionLabel}, neue Version v${this.versionInfo.latestVersion} verfügbar`;
      }

      return this.versionLabel;
    },
  },
};
</script>
