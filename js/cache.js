import { BOOKS_CACHE_KEY, CACHE_TTL } from './config.js';

export function getBooksCache() {
  try {
    const raw = localStorage.getItem(BOOKS_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    const now = Date.now();
    const age = now - (cached.timestamp || 0);

    if (age < CACHE_TTL && Array.isArray(cached.data)) {
      return cached.data;
    }

    localStorage.removeItem(BOOKS_CACHE_KEY);
    return null;
  } catch (error) {
    localStorage.removeItem(BOOKS_CACHE_KEY);
    return null;
  }
}

export function setBooksCache(books) {
  try {
    const payload = {
      data: books,
      timestamp: Date.now()
    };
    localStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('خطا در ذخیره کش کتاب‌ها:', error);
  }
}

export function clearBooksCache() {
  try {
    localStorage.removeItem(BOOKS_CACHE_KEY);
  } catch (error) {
    console.error('خطا در پاک‌سازی کش کتاب‌ها:', error);
  }
}
