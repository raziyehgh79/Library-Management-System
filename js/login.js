/**
 * Library Management System - Login Page Logic
 * 
 * Handles client-side validation, authentication requests, loading states,
 * cookie storage of JWT, and redirection.
 */

import { api, ApiError } from './api.js';
import { setAuthToken, setCurrentUser, redirectIfAuthenticated } from './auth.js';
import { showAlert } from './utils.js';

// Route guard: If user already has an active session, redirect to dashboard immediately
redirectIfAuthenticated();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const loginText = document.getElementById('loginText');
  const loginSpinner = document.getElementById('loginSpinner');
  const alertContainer = document.getElementById('alert-container');

  /**
   * Updates the UI loading state during asynchronous authentication.
   * Disabling the button prevents duplicate submissions (double clicks).
   * 
   * @param {boolean} isLoading
   */
  function setLoading(isLoading) {
    if (isLoading) {
      submitButton.disabled = true;
      if (loginSpinner) loginSpinner.classList.remove('hidden');
      if (loginText) loginText.textContent = 'Logging in...';
    } else {
      submitButton.disabled = false;
      if (loginSpinner) loginSpinner.classList.add('hidden');
      if (loginText) loginText.textContent = 'Login';
    }
  }

  /**
   * Validates email format using standard regex.
   * 
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (alertContainer) alertContainer.innerHTML = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Client-side validation checks
    if (!email) {
      showAlert(alertContainer, 'Please enter your email address.', 'error');
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showAlert(alertContainer, 'Please enter a valid email address (e.g. student@student.com).', 'error');
      emailInput.focus();
      return;
    }

    if (!password) {
      showAlert(alertContainer, 'Please enter your password.', 'error');
      passwordInput.focus();
      return;
    }

    try {
      setLoading(true);

      // Send login request to backend API
      const response = await api.post('/auth/login', {
        email,
        password
      });

      // Verification: ensure token was received
      if (!response || !response.token) {
        throw new ApiError('Authentication succeeded but no token was returned.');
      }

      /**
       * Crucial Step:
       * Per assignment rules, the JWT is stored in document.cookie so that:
       * 1. It persists across pages and refreshes
       * 2. Client-side JavaScript can read it to attach 'Authorization: Bearer <token>'
       */
      setAuthToken(response.token);

      // Cache user profile for immediate UI rendering on the dashboard
      if (response.user) {
        setCurrentUser(response.user);
      }

      showAlert(alertContainer, 'Login successful! Redirecting...', 'success', 0);

      // Smooth redirection to dashboard
      setTimeout(() => {
        window.location.replace('dashboard.html');
      }, 500);

    } catch (error) {
      console.error('[Login] Login attempt failed:', error);
      const message = error instanceof ApiError 
        ? error.message 
        : 'Could not log in. Please verify your credentials and try again.';
      showAlert(alertContainer, message, 'error');
    } finally {
      setLoading(false);
    }
  });
});
