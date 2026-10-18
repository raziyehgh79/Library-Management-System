import { api, ApiError } from './api.js';
import { setAuthToken, setCurrentUser, redirectIfAuthenticated } from './auth.js';
import { showAlert } from './utils.js';

redirectIfAuthenticated();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const loginText = document.getElementById('loginText');
  const loginSpinner = document.getElementById('loginSpinner');
  const alertContainer = document.getElementById('alert-container');

  function setLoading(isLoading) {
    if (isLoading) {
      submitButton.disabled = true;
      if (loginSpinner) loginSpinner.classList.remove('hidden');
      if (loginText) loginText.textContent = 'در حال ورود...';
    } else {
      submitButton.disabled = false;
      if (loginSpinner) loginSpinner.classList.add('hidden');
      if (loginText) loginText.textContent = 'ورود به سامانه';
    }
  }

  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (alertContainer) alertContainer.innerHTML = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      showAlert(alertContainer, 'لطفاً آدرس ایمیل خود را وارد نمایید.', 'error');
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showAlert(alertContainer, 'فرمت آدرس ایمیل نامعتبر است (مثال: student@student.com).', 'error');
      emailInput.focus();
      return;
    }

    if (!password) {
      showAlert(alertContainer, 'لطفاً رمز عبور خود را وارد نمایید.', 'error');
      passwordInput.focus();
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (!response || !response.token) {
        throw new ApiError('ورود به سرور موفق بود ولی توکنی دریافت نشد.');
      }

      setAuthToken(response.token);

      if (response.user) {
        setCurrentUser(response.user);
      }

      showAlert(alertContainer, 'ورود با موفقیت انجام شد! در حال انتقال به داشبورد...', 'success', 0);

      setTimeout(() => {
        window.location.replace('dashboard.html');
      }, 500);

    } catch (error) {
      console.error('خطا در فرآیند ورود:', error);
      const message = error instanceof ApiError 
        ? error.message 
        : 'ورود به سامانه انجام نشد. لطفاً مشخصات خود را بررسی و دوباره تلاش کنید.';
      showAlert(alertContainer, message, 'error');
    } finally {
      setLoading(false);
    }
  });
});
