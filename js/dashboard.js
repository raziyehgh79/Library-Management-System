import { api } from './api.js';
import { requireAuth, setCurrentUser, getCurrentUser } from './auth.js';
import { setupHeaderUser, formatDate, showAlert } from './utils.js';

requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  setupHeaderUser();

  const studentNameEl = document.getElementById('studentName');
  const activeLoansEl = document.getElementById('activeLoans');
  const availableBooksEl = document.getElementById('availableBooks');
  const alertContainer = document.getElementById('dashboardAlert');
  const statsContainer = document.getElementById('statsContainer');
  const profileCardEl = document.getElementById('profileCard');

  const cachedUser = getCurrentUser();
  if (cachedUser && studentNameEl) {
    studentNameEl.textContent = cachedUser.firstName 
      ? `${cachedUser.firstName} ${cachedUser.lastName || ''}`.trim() 
      : (cachedUser.email || 'دانشجو');
  }

  async function loadDashboardData() {
    try {
      if (statsContainer) statsContainer.classList.add('loading-pulse');

      const response = await api.get('/auth/me');

      if (!response || !response.success || !response.data) {
        throw new Error('فرمت پاسخ سرور برای دریافت پروفایل نامعتبر است.');
      }

      const { user, stats } = response.data;

      if (user) {
        setCurrentUser(user);
        setupHeaderUser();

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'دانشجو';
        if (studentNameEl) studentNameEl.textContent = fullName;

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
                <span class="profile-label">نقش کاربری:</span>
                <span class="profile-value">${roleLabel}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">تاریخ عضویت:</span>
                <span class="profile-value">${formatDate(user.createdAt)}</span>
              </div>
            </div>
          `;
        }
      }

      if (stats) {
        if (activeLoansEl) {
          activeLoansEl.textContent = Number(stats.activeLoans ?? 0).toLocaleString('fa-IR');
        }
        if (availableBooksEl) {
          availableBooksEl.textContent = Number(stats.availableBooks ?? 0).toLocaleString('fa-IR');
        }
      }

    } catch (error) {
      console.error('خطا در بارگذاری داشبورد:', error);
      showAlert(
        alertContainer,
        error.message || 'خطا در ارتباط با سرور هنگام دریافت اطلاعات داشبورد.',
        'error',
        0
      );
    } finally {
      if (statsContainer) statsContainer.classList.remove('loading-pulse');
    }
  }

  await loadDashboardData();
});
