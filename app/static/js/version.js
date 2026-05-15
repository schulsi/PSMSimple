async function loadAppVersion() {
  const badge = document.getElementById('app-version-badge');
  const label = document.getElementById('app-version-label');
  const update = document.getElementById('app-version-update');

  if (!badge || !label || !update) return;

  try {
    const version = await apiGet('/version');
    const appName = version.name || 'PSMSimple';
    const currentVersion = version.version || '';

    label.textContent = currentVersion ? `${appName} v${currentVersion}` : appName;
    badge.removeAttribute('href');
    badge.classList.remove('hidden', 'has-update');

    try {
      const check = await apiGet('/version/check');

      if (check.update_available && check.latest_version) {
        update.textContent = `Update verfügbar (v${check.latest_version})`;
        update.classList.remove('hidden');
        badge.classList.add('has-update');

        if (check.release_url) {
          badge.href = check.release_url;
        }
      }
    } catch (err) {
      console.warn('[loadAppVersion] Updateprüfung fehlgeschlagen:', err);
    }
  } catch (err) {
    console.warn('[loadAppVersion] Version konnte nicht geladen werden:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadAppVersion);
