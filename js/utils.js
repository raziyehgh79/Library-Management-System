/**
 * سامانه مدیریت کتابخانه - توابع و ابزارهای کمکی (Utils)
 * 
 * شامل:
 * - ضد عفونی کردن متن‌ها در برابر حملات تزریق اسکریپت (XSS)
 * - تبدیل و قالب‌بندی تاریخ‌ها به تقویم شمسی / محلی
 * - نمایش هشدارهای تعاملی به زبان فارسی
 * - مدیریت اطلاعات کاربر در هدر و منوی واکنش‌گرای موبایل
 */

import { getCurrentUser, logout } from './auth.js';

/**
 * پاک‌سازی کاراکترهای خطرناک HTML برای جلوگیری از آسیب‌پذیری XSS
 * قبل از تزریق متن‌های دریافتی از سرور به داخل قالب‌های رشته‌ای.
 * 
 * @param {any} input - ورودی کاربر یا سرور
 * @returns {string} رشته امن‌سازی‌شده
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
 * تبدیل رشته تاریخ ISO به فرمت استاندارد شمسی و خوانا.
 * 
 * @param {string|Date} dateVal - مقدار تاریخ
 * @returns {string} تاریخ فارسی (مثال: ۱۴۰۵/۰۶/۳۰)
 */
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

/**
 * نمایش پیام‌های هشدار، موفقیت یا خطا در ظرف مشخص‌شده.
 * 
 * @param {string|HTMLElement} target - شناسه کانتینر یا المنت DOM
 * @param {string} message - متن پیام
 * @param {'success'|'error'|'info'} type - نوع هشدار
 * @param {number} autoDismissMs - زمان محو خودکار (میلی‌ثانیه)
 */
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

/**
 * مقداردهی اولیه اطلاعات دانشجو در هدر (نام و آواتار) و اتصال دکمه خروج.
 */
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

  // رویداد خروج از سیستم
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('آیا مطمئن هستید که می‌خواهید از سیستم خارج شوید؟')) {
        logout();
      }
    });
  }

  // راه‌اندازی منوی واکنش‌گرای موبایل
  setupMobileNav();
}

/**
 * راه‌اندازی دکمه تاگل منوی موبایل.
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
