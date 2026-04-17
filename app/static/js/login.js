/* ════════════════════════════════════════
   LOGIN PAGE FUNCTIONALITY
   ════════════════════════════════════════ */

function showPanelAuth(panelName) {
  // Hide all auth panels and show selected one
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  const selectedPanel = document.getElementById('panel-' + panelName);
  if (selectedPanel) selectedPanel.classList.add('active');

  // Update nav active state
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const navLink = document.getElementById('nav-' + panelName);
  if (navLink) navLink.classList.add('active');
}

function toggleMobileNav() {
  const nav = document.querySelector('nav');
  const overlay = document.getElementById('nav-overlay');
  const open = nav.classList.toggle('open');
  overlay.classList.toggle('open', open);
}

function closeMobileNav() {
  const nav = document.querySelector('nav');
  const overlay = document.getElementById('nav-overlay');
  nav.classList.remove('open');
  overlay.classList.remove('open');
}

// Close mobile nav when clicking on nav links (mobile only)
document.addEventListener('DOMContentLoaded', () => {
  // Handle tab parameter in URL (?tab=register)
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'register') {
    showPanelAuth('register');
  }

  // Close mobile nav when clicking nav links
  document.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 640) closeMobileNav();
    });
  });
});
