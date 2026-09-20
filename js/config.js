/**
 * Library Management System - Application Configuration
 * 
 * Centralized configuration module.
 * Keeping the API base URL and storage constants in one place ensures
 * that any environment changes can be made with a single update,
 * without having to touch individual page scripts.
 */

// Verified backend API base URL (Course 15 / Hadi Tabatabaei server)
// Note: The previous liara.run URL is down (HTTP 503), whereas this URL is active.
export const API_BASE_URL = 'https://haditabatabaei.dev/api';

// Book list cache duration: 5 minutes (in milliseconds)
// 5 minutes * 60 seconds * 1000 milliseconds = 300,000 ms
export const CACHE_TTL = 5 * 60 * 1000;

// Cookie key used to store the JWT authentication token
export const TOKEN_COOKIE_NAME = 'library_token';

// LocalStorage key used to store the cached books response
export const BOOKS_CACHE_KEY = 'library_books_cache';

// LocalStorage key used to store current user info for instant UI hydration
export const USER_STORAGE_KEY = 'library_current_user';
