/**
 * Library Management System - My Loans Page Logic
 * 
 * Manages user's personal loan records:
 * - Fetches loans from /api/loans/my-loans
 * - Calculates loan statistics (Total, Active, Returned)
 * - Implements book return action with confirmation, loading indicator, and cache invalidation
 */

import { api } from './api.js';
import { requireAuth } from './auth.js';
import { clearBooksCache } from './cache.js';
import { setupHeaderUser, formatDate, escapeHtml, showAlert } from './utils.js';

// Route guard: Redirect unauthenticated visitors back to login.html
requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  setupHeaderUser();

  const loansTableBody = document.getElementById('loansTableBody');
  const totalLoansEl = document.getElementById('totalLoans');
  const activeLoansEl = document.getElementById('activeLoans');
  const returnedLoansEl = document.getElementById('returnedLoans');
  const alertContainer = document.getElementById('loansAlert');
  const tableCard = document.getElementById('tableCard');

  let myLoans = [];

  /**
   * Loads the current user's loans from the backend.
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
        throw new Error('Unexpected loan list response format.');
      }
    } catch (error) {
      console.error('[Loans] Error fetching loans:', error);
      showAlert(
        alertContainer,
        'Could not load your loan history. Please try again later.',
        'error',
        0
      );
      if (loansTableBody) {
        loansTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
              Failed to load loan records.
            </td>
          </tr>
        `;
      }
    }
  }

  /**
   * Displays placeholder skeleton rows while loan data is loading.
   */
  function showLoadingRows() {
    if (!loansTableBody) return;
    loansTableBody.innerHTML = Array.from({ length: 3 }).map(() => `
      <tr>
        <td colspan="5" style="text-align: center; padding: 1.5rem; color: #94a3b8;">
          <span class="loading" style="vertical-align: middle; margin-right: 0.5rem;"></span> Loading loans...
        </td>
      </tr>
    `).join('');
  }

  /**
   * Calculates and updates loan metrics on the page.
   * 
   * @param {Array} loans
   */
  function updateStatistics(loans) {
    const total = loans.length;
    const active = loans.filter(l => l.status === 'active' || l.status === 'overdue').length;
    const returned = loans.filter(l => l.status === 'returned').length;

    if (totalLoansEl) totalLoansEl.textContent = total;
    if (activeLoansEl) activeLoansEl.textContent = active;
    if (returnedLoansEl) returnedLoansEl.textContent = returned;

    const countHeaderEl = document.getElementById('loansCountHeader');
    if (countHeaderEl) {
      countHeaderEl.textContent = `Total: ${total} loan${total === 1 ? '' : 's'}`;
    }
  }

  /**
   * Renders the loans table rows.
   * 
   * @param {Array} loans
   */
  function renderLoans(loans) {
    if (!loansTableBody) return;

    if (!loans || loans.length === 0) {
      loansTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem 1rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📚</div>
            <h4 style="color: #1e293b; margin-bottom: 0.5rem;">No Loans Found</h4>
            <p style="color: #64748b; margin-bottom: 1rem;">You have not borrowed any books yet.</p>
            <a href="books.html" class="btn btn-primary btn-sm">Browse Books</a>
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
      let statusLabel = 'Active';

      if (status === 'returned') {
        statusBadgeClass = 'status-returned';
        statusLabel = 'Returned';
      } else if (status === 'overdue' || loan.isOverdue) {
        statusBadgeClass = 'status-overdue';
        statusLabel = 'Overdue';
      }

      return `
        <tr data-loan-id="${escapeHtml(loan.id)}">
          <td>
            <strong style="color: #0f172a;">${escapeHtml(book.title || 'Untitled Book')}</strong>
            <br>
            <small style="color: #64748b;">ISBN: ${escapeHtml(book.isbn || '—')}</small>
          </td>
          <td style="color: #334155;">${escapeHtml(book.author || 'Unknown')}</td>
          <td style="color: #334155;">
            <div><strong>Borrowed:</strong> ${formatDate(loan.loanDate || loan.createdAt)}</div>
            ${loan.dueDate ? `<div style="font-size: 0.85rem; color: #64748b;"><strong>Due:</strong> ${formatDate(loan.dueDate)}</div>` : ''}
            ${loan.returnDate ? `<div style="font-size: 0.85rem; color: #059669;"><strong>Returned:</strong> ${formatDate(loan.returnDate)}</div>` : ''}
          </td>
          <td>
            <span class="status ${statusBadgeClass}">${escapeHtml(statusLabel)}</span>
          </td>
          <td>
            ${isActive ? `
              <button class="btn btn-success btn-sm return-btn" data-id="${escapeHtml(loan.id)}">
                Return Book
              </button>
            ` : `
              <span class="badge badge-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.8rem; background: #e2e8f0; color: #475569; border-radius: 4px;">Completed</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Bind return actions
    attachReturnListeners();
  }

  /**
   * Binds click events to all "Return Book" buttons.
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
   * Handles book return request.
   * 
   * @param {string} loanId
   * @param {HTMLButtonElement} buttonEl
   */
  async function handleReturnBook(loanId, buttonEl) {
    if (!confirm('Are you sure you want to return this book?')) {
      return;
    }

    const originalText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = 'Returning...';

    try {
      // Call POST /api/loans/:id/return
      const response = await api.post(`/loans/${loanId}/return`, {
        notes: 'Book returned via student portal'
      });

      showAlert(
        alertContainer,
        response?.message || 'Book returned successfully! Thank you.',
        'success',
        5000
      );

      /**
       * CRITICAL CACHE INVALIDATION:
       * Now that a copy has been returned, the library inventory count has increased on the server.
       * Clearing the books cache guarantees that when the user next visits books.html,
       * fresh copy availability is loaded from the backend API.
       */
      clearBooksCache();

      // Update in-memory state
      const targetLoan = myLoans.find(l => l.id === loanId);
      if (targetLoan) {
        targetLoan.status = 'returned';
        targetLoan.returnDate = new Date().toISOString();
      }

      // Re-render loans and recalculate stats
      renderLoans(myLoans);
      updateStatistics(myLoans);

    } catch (error) {
      console.error('[Loans] Failed to return book:', error);
      showAlert(
        alertContainer,
        error.message || 'Could not return book. Please try again.',
        'error'
      );
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
    }
  }

  await loadLoans();
});
