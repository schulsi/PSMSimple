import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeTab: 'home',
    inventoryWarningCount: 0,
    user: {
      username: '',
      avatar: '?',
    },
  }),
  actions: {
    setActiveTab(tabName) {
      this.activeTab = tabName || 'home';
    },
    setInventoryWarningCount(count) {
      this.inventoryWarningCount = Number(count) || 0;
    },
    setUser(user = {}) {
      this.user = {
        username: user.username || '',
        avatar: user.avatar || '?',
      };
    },
  },
});
