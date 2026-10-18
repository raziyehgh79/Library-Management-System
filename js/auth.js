import { TOKEN_COOKIE_NAME, USER_STORAGE_KEY } from './config.js';
import { clearBooksCache } from './cache.js';

export function setAuthToken(token, days = 1) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Strict${secure}`;
}

export function getAuthToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === TOKEN_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function removeAuthToken() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict${secure}`;
}

export function isAuthenticated() {
  const token = getAuthToken();
  return Boolean(token && token.trim().length > 0);
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('خطا در ذخیره پروفایل کاربر در localStorage:', error);
  }
}

export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function removeCurrentUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.replace('login.html');
  }
}

export function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    window.location.replace('dashboard.html');
  }
}

export function logout() {
  removeAuthToken();
  removeCurrentUser();
  clearBooksCache();
  window.location.replace('login.html');
}
