/**
 * سامانه مدیریت کتابخانه - منطق داشبورد دانشجو (Dashboard Logic)
 * 
 * صفحه محافظت‌شده جهت دریافت و نمایش اطلاعات کاربر و آمار کتابخانه از اندپوینت /api/auth/me.
 */

import { api } from './api.js';
import { requireAuth, setCurrentUser, getCurrentUser } from './auth.js';
import { setupHeaderUser, formatDate, showAlert } from './utils.js';

// گارد صفحه: جلوگیری از دسترسی کاربران لاگین‌نشده
requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  // مقداردهی اولیه آواتار و نام کاربر در هدر و دکمه خروج
  setupHeaderUser();

  const studentNameEl = document.getElementById('studentName');
  const activeLoansEl = document.getElementById('activeLoans');
  const availableBooksEl = document.getElementById('availableBooks');
  const alertContainer = document.getElementById('dashboardAlert');
  const statsContainer = document.getElementById('statsContainer');
  const profileCardEl = document.getElementById('profileCard');

  // نمایش فوری اطلاعات کش‌شده قبلی کاربر برای جلوگیری از پرش صفحه
  const cachedUser = getCurrentUser();
  if (cachedUser && studentNameEl) {
    studentNameEl.textContent = cachedUser.firstName 
      ? `${cachedUser.firstName} ${cachedUser.lastName || ''}`.trim() 
      : (cachedUser.email || 'دانشجو');
  }

  /**
   * دریافت پروفایل تازه و آمار زنده امانت‌ها و کتاب‌ها از سرور.
   */
  async function loadDashboardData() {
    try {
      if (statsContainer) statsContainer.classList.add('loading-pulse');

      // فراخوانی اندپوینت محافظت‌شده /api/auth/me
      const response = await api.get('/auth/me');

      if (!response || !response.success || !response.data) {
        throw new Error('فرمت پاسخ سرور برای دریافت پروفایل نامعتبر است.');
      }

      const { user, stats } = response.data;

      // به‌روزرسانی اطلاعات کاربر در کش
      if (user) {
        setCurrentUser(user);
        setupHeaderUser();

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'دانشجو';
        if (studentNameEl) studentNameEl.textContent = fullName;

        // رندر کارت مشخصات فردی دانشجو به زبان فارسی
        if (profileCardEl) {
          const roleLabel = user.role === 'admin' ? 'مدیر سیستم' : (user.role === 'librarian' ? 'کتابدار' : 'دانشجو (عضو)');
          profileCardEl.innerHTML = `
            <div class="profile-details-grid">
              <div class="profile-item">
                <span class="profile-label">ایمیل دانشجو:</span>
                <span class="profile-value">${user.email || '—'}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">شماره دانشجویی:</span>
                <span class="profile-value">${user.studentId || '—'}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">نقش در سامانه:</span>
                <span class="profile-value"><span class="badge badge-info">${roleLabel}</span></span>
              </div>
              <div class="profile-item">
                <span class="profile-label">گروه تحصیلی:</span>
                <span class="profile-value">${user.group || 'الف'}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">وضعیت عضویت:</span>
                <span class="profile-value"><span class="badge badge-success">فعال</span></span>
              </div>
              <div class="profile-item">
                <span class="profile-label">آخرین زمان ورود:</span>
                <span class="profile-value">${formatDate(user.lastLogin || new Date())}</span>
              </div>
            </div>
          `;
        }
      }

      // به‌روزرسانی کارت‌های آمار زنده
      if (stats) {
        if (activeLoansEl) activeLoansEl.textContent = Number(stats.activeLoans ?? 0).toLocaleString('fa-IR');
        if (availableBooksEl) availableBooksEl.textContent = Number(stats.availableBooks ?? 0).toLocaleString('fa-IR');
      }

    } catch (error) {
      console.error('[داشبورد] خطا در دریافت اطلاعات:', error);
      if (alertContainer) {
        showAlert(
          alertContainer,
          'امکان دریافت جدیدترین آمار وجود ندارد. لطفاً صفحه را رفرش نمایید یا بعداً تلاش کنید.',
          'error',
          0
        );
      }
    } finally {
      if (statsContainer) statsContainer.classList.remove('loading-pulse');
    }
  }

  await loadDashboardData();
});
