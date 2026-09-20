/**
 * سامانه مدیریت کتابخانه - ماژول کلاینت API
 * 
 * این ماژول ارتباط متمرکز با سرور را مدیریت می‌کند:
 * - اضافه کردن خودکار آدرس سرور
 * - خواندن توکن از کوکی و تزریق خودکار هدر Authorization: Bearer <token>
 * - اضافه کردن هدر Content-Type برای ارسال JSON
 * - پردازش پاسخ‌های JSON
 * - تبدیل کدهای خطای HTTP به پیام‌های خطای فارسی و کاربرپسند
 * - تشخیص انقضای نشست (401) و خروج خودکار
 */

import { API_BASE_URL } from './config.js';
import { getAuthToken, logout } from './auth.js';

/**
 * کلاس اختصاصی خطاهای API که پیام فارسی و کد وضعیت HTTP را نگهداری می‌کند.
 */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * تبدیل کدهای وضعیت HTTP و پاسخ‌های سرور به پیام‌های روان و فارسی.
 * 
 * @param {number} status - کد وضعیت HTTP
 * @param {object|null} responseData - داده‌های خطای دریافتی از سرور
 * @returns {string} پیام خطای قابل فهم برای کاربر
 */
function parseErrorMessage(status, responseData) {
  // اگر سرور پیام مشخصی در فیلدهای message یا error ارسال کرده باشد:
  if (responseData && typeof responseData === 'object') {
    if (responseData.message) {
      // ترجمه پیام‌های رایج بک‌اند به فارسی روان
      const msg = responseData.message;
      if (msg.includes('Account is inactive or does not exist')) {
        return 'حساب کاربری با این ایمیل یافت نشد یا غیرفعال است.';
      }
      if (msg.includes('Invalid email or password')) {
        return 'ایمیل یا رمز عبور وارد شده نادرست است.';
      }
      if (msg.includes('already have this book on loan')) {
        return 'شما در حال حاضر این کتاب را در امانت خود دارید.';
      }
      if (msg.includes('not available for loan')) {
        return 'این کتاب در حال حاضر نسخه موجودی برای امانت ندارد.';
      }
      return msg;
    }
    if (responseData.error) return responseData.error;
    if (Array.isArray(responseData.details) && responseData.details.length > 0) {
      return responseData.details.map(d => d.message || d.field).join('، ');
    }
  }

  // پیام‌های پیش‌فرض بر اساس کد وضعیت HTTP
  switch (status) {
    case 400:
      return 'اطلاعات ارسالی نامعتبر است. لطفاً ورودی‌ها را بررسی کنید.';
    case 401:
      return 'نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.';
    case 403:
      return 'شما دسترسی لازم برای انجام این عملیات را ندارید.';
    case 404:
      return 'مورد درخواستی در سامانه پیدا نشد.';
    case 409:
      return 'تداخل: این کتاب قبلاً به امانت گرفته شده است.';
    case 429:
      return 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً لحظاتی دیگر تلاش کنید.';
    case 500:
    case 502:
    case 503:
      return 'خطایی در سرور رخ داده است. لطفاً کمی بعد تلاش کنید.';
    default:
      return 'خطای غیرمنتظره‌ای رخ داد. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش کنید.';
  }
}

/**
 * تابع مرکزی ارسال درخواست به سرور همراه با هدر احراز هویت.
 * 
 * @param {string} endpoint - مسیر اندپوینت (مثلاً /books یا /loans/my-loans)
 * @param {object} options - تنظیمات درخواست
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const headers = {
    'Accept': 'application/json',
    ...options.headers
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // خواندن توکن از کوکی و اضافه کردن به هدر در صورت لاگین بودن
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (networkError) {
    console.error('[API] خطای اتصال به شبکه:', networkError);
    throw new ApiError(
      'امکان برقراری ارتباط با سرور کتابخانه وجود ندارد. لطفاً اینترنت خود را بررسی کنید.',
      0,
      networkError
    );
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseError) {
      console.warn('[API] خطا در پارس کردن پاسخ JSON:', parseError);
    }
  }

  if (!response.ok) {
    // در صورت دریافت خطای 401 در صفحات داخلی، کاربر خارج می‌شود
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      console.warn('[API] دریافت خطای 401 - توکن منقضی شده است.');
      setTimeout(() => logout(), 500);
    }

    const message = parseErrorMessage(response.status, data);
    console.error(`[API] درخواست ناموفق [${response.status} ${cleanEndpoint}]:`, message, data);
    throw new ApiError(message, response.status, data);
  }

  return data;
}

/**
 * آبجکت دسترسی سریع به متدهای HTTP
 */
export const api = {
  get(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'GET'
    });
  },

  post(endpoint, body = null, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }
};
