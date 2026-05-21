const bridge = {
  exportView: null,
  settingsView: null,
  toast: null,
};

export function setToastHandler(handler) {
  bridge.toast = handler;
  return () => {
    if (bridge.toast === handler) {
      bridge.toast = null;
    }
  };
}

export function toast(message, duration) {
  bridge.toast?.(message, duration);
}

export function registerExportView(api) {
  bridge.exportView = api;
  return () => {
    if (bridge.exportView === api) {
      bridge.exportView = null;
    }
  };
}

export function registerSettingsView(api) {
  bridge.settingsView = api;
  return () => {
    if (bridge.settingsView === api) {
      bridge.settingsView = null;
    }
  };
}

export function applyDefaultSettingsToExport(settings) {
  bridge.exportView?.applyDefaultSettingsToExport?.(settings);
}

export function updateExportButtons(localSave) {
  bridge.exportView?.updateExportButtons?.(localSave);
}

export function applyUserSettings(settings) {
  bridge.settingsView?.applyUserSettings?.(settings);
}
