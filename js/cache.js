/**
 * Library Management System - Cache Module
 * 
 * Implements a 5-minute client-side cache using localStorage for the books API response.
 * Demonstrates proper cache expiration (TTL) and cache invalidation workflows.
 */

import { BOOKS_CACHE_KEY, CACHE_TTL } from './config.js';

/**
 * Retrieves cached books from localStorage if available and not expired.
 * 
 * Cache Flow:
 * 1. Read JSON string from localStorage
 * 2. If present, compare (Date.now() - timestamp) against CACHE_TTL (5 minutes)
 * 3. If within 5 minutes, return the cached data array
 * 4. If expired, clean up the stale cache and return null
 * 
 * @returns {Array|null} Array of books, or null if cache is missing/expired
 */
export function getBooksCache() {
  try {
    const raw = localStorage.getItem(BOOKS_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    const now = Date.now();
    const age = now - (cached.timestamp || 0);

    // Is the cached data younger than 5 minutes?
    if (age < CACHE_TTL && Array.isArray(cached.data)) {
      console.info(`[Cache] Using cached books (${Math.round(age / 1000)}s old)`);
      return cached.data;
    }

    // Cache is expired - remove it
    console.info('[Cache] Books cache expired, invalidating');
    localStorage.removeItem(BOOKS_CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('[Cache] Error reading books cache:', error);
    localStorage.removeItem(BOOKS_CACHE_KEY);
    return null;
  }
}

/**
 * Saves books array to localStorage with current timestamp.
 * 
 * @param {Array} books - Array of book objects received from the API
 */
export function setBooksCache(books) {
  try {
    const payload = {
      data: books,
      timestamp: Date.now()
    };
    localStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(payload));
    console.info(`[Cache] Saved ${books.length} books to cache (valid for 5 mins)`);
  } catch (error) {
    console.error('[Cache] Failed to write books cache to localStorage:', error);
  }
}

/**
 * Explicitly invalidates (deletes) the books cache.
 * 
 * CRITICAL ARCHITECTURAL DECISION:
 * When a user borrows or returns a book, the available copy count on the server changes.
 * If we kept the 5-minute cache, the user would see stale availability numbers.
 * Therefore, calling clearBooksCache() immediately after a successful borrow or return
 * guarantees the next books request fetches fresh data from the backend.
 */
export function clearBooksCache() {
  try {
    localStorage.removeItem(BOOKS_CACHE_KEY);
    console.info('[Cache] Books cache successfully cleared.');
  } catch (error) {
    console.error('[Cache] Failed to clear books cache:', error);
  }
}
