import { API_BASE_URL } from './config.js';
import { getAuthToken, logout } from './auth.js';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function parseErrorMessage(status, responseData) {
  if (responseData && typeof responseData === 'object') {
    if (responseData.message) {
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
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      setTimeout(() => logout(), 500);
    }

    const message = parseErrorMessage(response.status, data);
    throw new ApiError(message, response.status, data);
  }

  return data;
}

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
