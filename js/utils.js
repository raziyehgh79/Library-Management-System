import { getCurrentUser, logout } from './auth.js';

export function escapeHtml(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, match => entityMap[match]);
}

export function formatDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return '—';
  }
}

export function showAlert(target, message, type = 'error', autoDismissMs = 6000) {
  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${escapeHtml(type)}" role="alert">
      <span>${escapeHtml(message)}</span>
      <button type="button" class="alert-close" aria-label="بستن" onclick="this.parentElement.remove()">&times;</button>
    </div>
  `;

  if (autoDismissMs > 0) {
    setTimeout(() => {
      if (container.firstElementChild) {
        container.innerHTML = '';
      }
    }, autoDismissMs);
  }
}

export function setupHeaderUser() {
  const user = getCurrentUser();
  const userNameEl = document.getElementById('userName');
  const userAvatarEl = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'دانشجو';
    if (userNameEl) {
      userNameEl.textContent = fullName;
    }
    if (userAvatarEl) {
      const initial = (user.firstName ? user.firstName[0] : (user.email ? user.email[0] : 'د')).toUpperCase();
      userAvatarEl.textContent = initial;
    }
  }

  if (logoutBtn && logoutBtn.dataset.hasLogoutListener !== 'true') {
    logoutBtn.dataset.hasLogoutListener = 'true';
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('آیا مطمئن هستید که می‌خواهید از سیستم خارج شوید؟')) {
        logout();
      }
    });
  }

  setupMobileNav();
}

export function setupMobileNav() {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('primaryNav') || document.getElementById('publicNav') || document.querySelector('.nav');

  if (menuToggle && nav) {
    if (menuToggle.dataset.hasMobileListener === 'true') {
      return;
    }
    menuToggle.dataset.hasMobileListener = 'true';

    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = nav.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
        nav.classList.remove('nav-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}
