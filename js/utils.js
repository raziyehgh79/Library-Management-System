/**
 * Library Management System - Utility Helpers
 * 
 * Reusable DOM helpers, security sanitizers, date formatters, and UI alert helpers.
 */

import { getCurrentUser, logout } from './auth.js';

/**
 * Escapes special HTML characters to prevent XSS (Cross-Site Scripting)
 * when inserting dynamic text into template strings.
 * 
 * @param {any} input - String or value to sanitize
 * @returns {string} Sanitized string safe for DOM interpolation
 */
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

/**
 * Formats an ISO date string into a clean, human-readable date.
 * 
 * @param {string|Date} dateVal - Date input
 * @returns {string} Formatted date string (e.g. "2026-09-20")
 */
export function formatDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '—';
  }
}

/**
 * Displays an alert message inside a designated container element.
 * 
 * @param {string|HTMLElement} target - Container ID or HTMLElement
 * @param {string} message - Message text
 * @param {'success'|'error'|'info'} type - Alert style type
 * @param {number} autoDismissMs - Auto dismiss duration (0 to stay)
 */
export function showAlert(target, message, type = 'error', autoDismissMs = 6000) {
  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${escapeHtml(type)} alert-dismissible" role="alert">
      <span>${escapeHtml(message)}</span>
      <button type="button" class="alert-close" aria-label="Close" onclick="this.parentElement.remove()">&times;</button>
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

/**
 * Initializes header user info (avatar, display name) and wires the logout button.
 * Can be called on any protected page (dashboard, books, my-loans).
 */
export function setupHeaderUser() {
  const user = getCurrentUser();
  const userNameEl = document.getElementById('userName');
  const userAvatarEl = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Student';
    if (userNameEl) {
      userNameEl.textContent = fullName;
    }
    if (userAvatarEl) {
      const initial = (user.firstName ? user.firstName[0] : (user.email ? user.email[0] : 'S')).toUpperCase();
      userAvatarEl.textContent = initial;
    }
  }

  // Bind logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out?')) {
        logout();
      }
    });
  }

  // Setup mobile navigation toggle
  setupMobileNav();
}

/**
 * Sets up mobile menu toggle button for responsive layouts.
 */
function setupMobileNav() {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('primaryNav');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
  }
}
