function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toast(message, duration = 2600) {
  const el = $('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}

function showTab(tabName, navEl = null) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('nav a').forEach(a => {
    a.classList.remove('active');
  });

  if (navEl) {
    navEl.classList.add('active');
  }

  closeUserPopup();
}

function openModal(id) {
  const el = $(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove('open');
}

function toggleUserPopup() {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (!popup || !button) return;

  const isOpen = popup.classList.contains('open');

  popup.classList.toggle('open', !isOpen);
  button.classList.toggle('open', !isOpen);

  if (!isOpen) {
    positionUserPopup();
  }
}

function closeUserPopup() {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (popup) popup.classList.remove('open');
  if (button) button.classList.remove('open');
}

function positionUserPopup() {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (!popup || !button) return;

  const rect = button.getBoundingClientRect();
  const popupWidth = 212;
  const left = rect.left;
  const top = rect.top - 8 - popup.offsetHeight;

  popup.style.left = `${Math.max(8, left)}px`;
  popup.style.top = `${Math.max(8, top)}px`;
  popup.style.width = `${popupWidth}px`;
}

document.addEventListener('click', (event) => {
  const popup = $('user-popup');
  const button = $('user-btn');

  if (!popup || !button) return;

  const clickedInsidePopup = popup.contains(event.target);
  const clickedButton = button.contains(event.target);

  if (!clickedInsidePopup && !clickedButton) {
    closeUserPopup();
  }
});

window.addEventListener('resize', () => {
  const popup = $('user-popup');
  if (popup && popup.classList.contains('open')) {
    positionUserPopup();
  }
});