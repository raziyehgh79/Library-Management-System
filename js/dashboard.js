/**
 * Library Management System - Student Dashboard Logic
 * 
 * Protected page that loads current student profile and statistics from /api/auth/me.
 */

import { api } from './api.js';
import { requireAuth, setCurrentUser, getCurrentUser } from './auth.js';
import { setupHeaderUser, formatDate, showAlert } from './utils.js';

// Route guard: Redirect unauthenticated visitors back to login.html
requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize header user avatar and logout button
  setupHeaderUser();

  const studentNameEl = document.getElementById('studentName');
  const activeLoansEl = document.getElementById('activeLoans');
  const availableBooksEl = document.getElementById('availableBooks');
  const alertContainer = document.getElementById('dashboardAlert');
  const statsContainer = document.getElementById('statsContainer');
  const profileCardEl = document.getElementById('profileCard');

  // Pre-populate with cached user data if available (prevents layout shift / blank name)
  const cachedUser = getCurrentUser();
  if (cachedUser && studentNameEl) {
    studentNameEl.textContent = cachedUser.firstName 
      ? `${cachedUser.firstName} ${cachedUser.lastName || ''}`.trim() 
      : (cachedUser.email || 'Student');
  }

  /**
   * Fetches fresh user profile and library statistics from the backend.
   */
  async function loadDashboardData() {
    try {
      if (statsContainer) statsContainer.classList.add('loading-pulse');

      // Call protected /api/auth/me endpoint (auth header injected automatically by api.js)
      const response = await api.get('/auth/me');

      if (!response || !response.success || !response.data) {
        throw new Error('Unexpected response format from profile endpoint');
      }

      const { user, stats } = response.data;

      // Update cached user profile with latest details
      if (user) {
        setCurrentUser(user);
        setupHeaderUser();

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Student';
        if (studentNameEl) studentNameEl.textContent = fullName;

        // Render detailed student profile card
        if (profileCardEl) {
          profileCardEl.innerHTML = `
            <div class="profile-details-grid">
              <div class="profile-item">
                <span class="profile-label">Email:</span>
                <span class="profile-value">${user.email || '—'}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Student ID:</span>
                <span class="profile-value">${user.studentId || '—'}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Role:</span>
                <span class="profile-value"><span class="badge badge-info">${user.role || 'member'}</span></span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Group:</span>
                <span class="profile-value">${user.group || 'A'}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Account Status:</span>
                <span class="profile-value"><span class="badge badge-success">Active</span></span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Last Login:</span>
                <span class="profile-value">${formatDate(user.lastLogin || new Date())}</span>
              </div>
            </div>
          `;
        }
      }

      // Populate live statistics
      if (stats) {
        if (activeLoansEl) activeLoansEl.textContent = stats.activeLoans ?? 0;
        if (availableBooksEl) availableBooksEl.textContent = stats.availableBooks ?? 0;
      }

    } catch (error) {
      console.error('[Dashboard] Error loading dashboard data:', error);
      if (alertContainer) {
        showAlert(
          alertContainer,
          'Unable to load latest statistics. Please refresh or try again later.',
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
