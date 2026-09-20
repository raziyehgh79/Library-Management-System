/**
 * سامانه مدیریت کتابخانه - منطق صفحه ورود (Login Logic)
 * 
 * شامل اعتبارسنجی سمت کلاینت، درخواست به API ورود، وضعیت لودینگ،
 * ذخیره‌سازی توکن JWT در کوکی و هدایت به داشبورد.
 */

import { api, ApiError } from './api.js';
import { setAuthToken, setCurrentUser, redirectIfAuthenticated } from './auth.js';
import { showAlert } from './utils.js';

// گارد صفحه: اگر کاربر قبلاً لاگین کرده باشد، مستقیماً به داشبورد هدایت می‌شود
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
   * تغییر وضعیت دکمه در زمان ارسال درخواست آسنکرون به سرور.
   * غیرفعال شدن دکمه از ارسال درخواست‌های تکراری با کلیک چندباره جلوگیری می‌کند.
   * 
   * @param {boolean} isLoading
   */
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

  /**
   * بررسی صحت ساختار ایمیل با عبارات باقاعده (Regex).
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

    // اعتبارسنجی فیلدها در سمت کلاینت
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

      // ارسال درخواست ورود به بک‌اند
      const response = await api.post('/auth/login', {
        email,
        password
      });

      // بررسی بازگشت توکن معتبر
      if (!response || !response.token) {
        throw new ApiError('ورود به سرور موفق بود ولی توکنی دریافت نشد.');
      }

      /**
       * مرحله کلیدی:
       * توکن در document.cookie ذخیره می‌شود تا:
       * ۱. با رفرش صفحه از بین نرود.
       * ۲. اسکریپت کلاینت بتواند آن را خوانده و در هدر Authorization ارسال کند.
       */
      setAuthToken(response.token);

      // کش کردن اطلاعات کاربر جهت نمایش بلافاصله در داشبورد
      if (response.user) {
        setCurrentUser(response.user);
      }

      showAlert(alertContainer, 'ورود با موفقیت انجام شد! در حال انتقال به داشبورد...', 'success', 0);

      // انتقال آرام به داشبورد دانشجو
      setTimeout(() => {
        window.location.replace('dashboard.html');
      }, 500);

    } catch (error) {
      console.error('[ورود] خطا در فرآیند ورود:', error);
      const message = error instanceof ApiError 
        ? error.message 
        : 'ورود به سامانه انجام نشد. لطفاً مشخصات خود را بررسی و دوباره تلاش کنید.';
      showAlert(alertContainer, message, 'error');
    } finally {
      setLoading(false);
    }
  });
});
