/**
 * سامانه مدیریت کتابخانه - منطق صفحه امانت‌های من (My Loans Page Logic)
 * 
 * وظایف این ماژول:
 * - استعلام امانت‌های دانشجو از اندپوینت /api/loans/my-loans
 * - محاسبه آمار امانت‌ها (کل، امانت‌های فعال، کتاب‌های تحویل‌شده)
 * - عملیات بازگرداندن کتاب، اخذ تاییدیه، نشانگر لودینگ و باطل‌سازی خودکار کش
 */

import { api } from './api.js';
import { requireAuth } from './auth.js';
import { clearBooksCache } from './cache.js';
import { setupHeaderUser, formatDate, escapeHtml, showAlert } from './utils.js';

// گارد صفحه: جلوگیری از دسترسی کاربران غیرمجاز
requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  setupHeaderUser();

  const loansTableBody = document.getElementById('loansTableBody');
  const totalLoansEl = document.getElementById('totalLoans');
  const activeLoansEl = document.getElementById('activeLoans');
  const returnedLoansEl = document.getElementById('returnedLoans');
  const alertContainer = document.getElementById('loansAlert');

  let myLoans = [];

  /**
   * دریافت سوابق امانت‌های کاربر جاری از سرور.
   */
  async function loadLoans() {
    try {
      showLoadingRows();

      const response = await api.get('/loans/my-loans');
      if (response && Array.isArray(response.data)) {
        myLoans = response.data;
        renderLoans(myLoans);
        updateStatistics(myLoans);
      } else {
        throw new Error('فرمت پاسخ فهرست امانت‌ها از سرور نامعتبر است.');
      }
    } catch (error) {
      console.error('[امانت‌ها] خطا در دریافت فهرست امانت‌ها:', error);
      showAlert(
        alertContainer,
        'دریافت تاریخچه امانت‌های شما با خطا مواجه شد. لطفاً دوباره تلاش فرمایید.',
        'error',
        0
      );
      if (loansTableBody) {
        loansTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              دریافت اطلاعات سوابق امانت ناموفق بود.
            </td>
          </tr>
        `;
      }
    }
  }

  /**
   * نمایش ردیف‌های اسکلتون تا زمان دریافت پاسخ شبکه.
   */
  function showLoadingRows() {
    if (!loansTableBody) return;
    loansTableBody.innerHTML = Array.from({ length: 3 }).map(() => `
      <tr>
        <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-light);">
          <span class="loading"></span> در حال بارگذاری سوابق امانت...
        </td>
      </tr>
    `).join('');
  }

  /**
   * محاسبه و به‌روزرسانی کارت‌های آماری سوابق امانت.
   * 
   * @param {Array} loans
   */
  function updateStatistics(loans) {
    const total = loans.length;
    const active = loans.filter(l => l.status === 'active' || l.status === 'overdue').length;
    const returned = loans.filter(l => l.status === 'returned').length;

    if (totalLoansEl) totalLoansEl.textContent = total.toLocaleString('fa-IR');
    if (activeLoansEl) activeLoansEl.textContent = active.toLocaleString('fa-IR');
    if (returnedLoansEl) returnedLoansEl.textContent = returned.toLocaleString('fa-IR');

    const countHeaderEl = document.getElementById('loansCountHeader');
    if (countHeaderEl) {
      countHeaderEl.textContent = `مجموع: ${total.toLocaleString('fa-IR')} مورد`;
    }
  }

  /**
   * رندر ردیف‌های جدول سوابق امانت به همراه برچسب‌های وضعیت فارسی.
   * 
   * @param {Array} loans
   */
  function renderLoans(loans) {
    if (!loansTableBody) return;

    if (!loans || loans.length === 0) {
      loansTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3.5rem 1rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📚</div>
            <h4 style="color: var(--text-main); margin-bottom: 0.5rem; font-size: 1.15rem;">هیچ سابقه امانتی ثبت نشده است</h4>
            <p style="color: var(--text-muted); margin-bottom: 1.25rem;">شما در حال حاضر هیچ کتابی را به امانت نگرفته‌اید.</p>
            <a href="books.html" class="btn btn-primary btn-sm">مشاهده کاتالوگ کتاب‌ها</a>
          </td>
        </tr>
      `;
      return;
    }

    loansTableBody.innerHTML = loans.map(loan => {
      const book = loan.book || {};
      const status = (loan.status || 'active').toLowerCase();
      const isActive = status === 'active' || status === 'overdue';

      let statusBadgeClass = 'status-active';
      let statusLabel = 'امانت فعال';

      if (status === 'returned') {
        statusBadgeClass = 'status-returned';
        statusLabel = 'بازگردانده شده';
      } else if (status === 'overdue' || loan.isOverdue) {
        statusBadgeClass = 'status-overdue';
        statusLabel = 'دارای دیرکرد';
      }

      return `
        <tr data-loan-id="${escapeHtml(loan.id)}">
          <td>
            <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(book.title || 'کتاب بدون عنوان')}</strong>
            <br>
            <small style="color: var(--text-muted);">شابک: ${escapeHtml(book.isbn || '—')}</small>
          </td>
          <td style="color: var(--text-main); font-weight: 500;">${escapeHtml(book.author || 'نامشخص')}</td>
          <td style="color: #334155; font-size: 0.9rem;">
            <div><span>تاریخ دریافت:</span> <strong>${formatDate(loan.loanDate || loan.createdAt)}</strong></div>
            ${loan.dueDate ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;"><span>مهلت تحویل:</span> ${formatDate(loan.dueDate)}</div>` : ''}
            ${loan.returnDate ? `<div style="font-size: 0.85rem; color: #059669; margin-top: 0.2rem;"><span>تاریخ تحویل:</span> ${formatDate(loan.returnDate)}</div>` : ''}
          </td>
          <td>
            <span class="status ${statusBadgeClass}">${escapeHtml(statusLabel)}</span>
          </td>
          <td>
            ${isActive ? `
              <button class="btn btn-success btn-sm return-btn" data-id="${escapeHtml(loan.id)}">
                بازگرداندن کتاب
              </button>
            ` : `
              <span class="badge badge-secondary" style="font-size: 0.82rem; padding: 0.4rem 0.8rem; background: #e2e8f0; color: #475569; border-radius: 4px;">تحویل شد</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // اتصال رویدادهای بازگرداندن کتاب
    attachReturnListeners();
  }

  /**
   * اتصال کلیک به تمام دکمه‌های «بازگرداندن کتاب».
   */
  function attachReturnListeners() {
    const returnButtons = loansTableBody.querySelectorAll('.return-btn');
    returnButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const loanId = e.currentTarget.dataset.id;
        await handleReturnBook(loanId, e.currentTarget);
      });
    });
  }

  /**
   * ارسال درخواست بازگرداندن کتاب به سرور.
   * 
   * @param {string} loanId
   * @param {HTMLButtonElement} buttonEl
   */
  async function handleReturnBook(loanId, buttonEl) {
    if (!confirm('آیا از بازگرداندن این کتاب اطمینان دارید؟')) {
      return;
    }

    const originalText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = 'در حال ثبت...';

    try {
      // ارسال درخواست به POST /api/loans/:id/return
      const response = await api.post(`/loans/${loanId}/return`, {
        notes: 'تحویل داده شده از طریق پنل دانشجویی'
      });

      showAlert(
        alertContainer,
        response?.message || 'کتاب با موفقیت بازگردانده شد. با تشکر از امانت‌داری شما!',
        'success',
        5000
      );

      /**
       * باطل‌سازی کش در زمان پس دادن کتاب:
       * با تحویل کتاب، یک نسخه به موجودی کتابخانه در سرور افزوده می‌شود.
       * با فراخوانی clearBooksCache() تضمین می‌کنیم که کاربر در صفحه کتاب‌ها، موجودی جدید را خواهد دید.
       */
      clearBooksCache();

      // تغییر وضعیت در حافظه کلاینت
      const targetLoan = myLoans.find(l => l.id === loanId);
      if (targetLoan) {
        targetLoan.status = 'returned';
        targetLoan.returnDate = new Date().toISOString();
      }

      // رندر مجدد جدول و ارقام آماری
      renderLoans(myLoans);
      updateStatistics(myLoans);

    } catch (error) {
      console.error('[امانت‌ها] خطا در بازگرداندن کتاب:', error);
      showAlert(
        alertContainer,
        error.message || 'عملیات بازگرداندن کتاب انجام نشد. لطفاً مجدداً تلاش کنید.',
        'error'
      );
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
    }
  }

  await loadLoans();
});
