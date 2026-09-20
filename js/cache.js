/**
 * سامانه مدیریت کتابخانه - ماژول مدیریت کش کتاب‌ها (Cache Module)
 * 
 * پیاده‌سازی کش ۵ دقیقه‌ای نتایج کتاب‌ها با استفاده از localStorage.
 * این ماژول دارای مکانیزم بررسی انقضای زمانی (TTL) و باطل‌سازی خودکار (Invalidation) است.
 */

import { BOOKS_CACHE_KEY, CACHE_TTL } from './config.js';

/**
 * دریافت فهرست کتاب‌ها از کش localStorage در صورت معتبر بودن و نگذشتن ۵ دقیقه.
 * 
 * روند کار:
 * ۱. خواندن رشته ذخیره شده از localStorage
 * ۲. محاسبه زمان سپری شده: Date.now() - timestamp
 * ۳. اگر زمان کمتر از ۵ دقیقه باشد، داده کش شده برگردانده می‌شود.
 * ۴. اگر ۵ دقیقه گذشته باشد، کش کهنه پاک شده و null برگردانده می‌شود تا درخواست جدید به سرور برود.
 * 
 * @returns {Array|null} آرایه کتاب‌ها یا null در صورت نبود یا انقضای کش
 */
export function getBooksCache() {
  try {
    const raw = localStorage.getItem(BOOKS_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    const now = Date.now();
    const age = now - (cached.timestamp || 0);

    // آیا سن داده کمتر از ۵ دقیقه است؟
    if (age < CACHE_TTL && Array.isArray(cached.data)) {
      console.info(`[کش] استفاده از داده‌های کش‌شده کتاب‌ها (عمر کش: ${Math.round(age / 1000)} ثانیه)`);
      return cached.data;
    }

    // کش منقضی شده است
    console.info('[کش] زمان ۵ دقیقه کش به پایان رسید، باطل‌سازی و دریافت مجدد از سرور');
    localStorage.removeItem(BOOKS_CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('[کش] خطا در خواندن کش کتاب‌ها:', error);
    localStorage.removeItem(BOOKS_CACHE_KEY);
    return null;
  }
}

/**
 * ذخیره داده‌های دریافتی از سرور در کش localStorage به همراه برچسب زمانی فعلی.
 * 
 * @param {Array} books - آرایه کتاب‌های دریافتی از سرور
 */
export function setBooksCache(books) {
  try {
    const payload = {
      data: books,
      timestamp: Date.now()
    };
    localStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(payload));
    console.info(`[کش] تعداد ${books.length} کتاب با موفقیت در کش ذخیره شد (اعتبار: ۵ دقیقه)`);
  } catch (error) {
    console.error('[کش] خطا در ذخیره کش کتاب‌ها:', error);
  }
}

/**
 * باطل‌سازی مستقیم و دستی کش کتاب‌ها (Cache Invalidation).
 * 
 * تصمیم معماری بسیار مهم:
 * زمانی که کاربری کتابی را امانت می‌گیرد یا پس می‌دهد، تعداد نسخه‌های موجود آن در سرور تغییر می‌کند.
 * اگر کش را پاک نکنیم، کاربر تا ۵ دقیقه اطلاعات قدیمی را خواهد دید.
 * بنابراین بلافاصله پس از امانت گرفتن یا بازگرداندن کتاب، این تابع فراخوانی می‌شود
 * تا در مراجعه بعدی کاربر به صفحه کتاب‌ها، داده‌های تازه از سرور دریافت شوند.
 */
export function clearBooksCache() {
  try {
    localStorage.removeItem(BOOKS_CACHE_KEY);
    console.info('[کش] کش کتاب‌ها با موفقیت باطل و پاک‌سازی شد.');
  } catch (error) {
    console.error('[کش] خطا در پاک‌سازی کش کتاب‌ها:', error);
  }
}
