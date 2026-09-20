/**
 * Library Management System - API Client Module
 * 
 * Centralized fetch abstraction that handles:
 * - Prepending the verified base URL
 * - Reading the JWT token from the cookie and appending the Authorization: Bearer <token> header
 * - Automatic Content-Type headers for JSON bodies
 * - Normalized JSON response parsing
 * - Comprehensive HTTP status code inspection and user-friendly error translation
 * - Detecting 401 Unauthorized sessions and executing graceful cleanup
 */

import { API_BASE_URL } from './config.js';
import { getAuthToken, logout } from './auth.js';

/**
 * Custom API Error class providing friendly user messages alongside technical HTTP details.
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
 * Converts HTTP status codes and server error payloads into clear, human-readable messages.
 * 
 * @param {number} status - HTTP status code
 * @param {object|null} responseData - Parsed JSON body returned by the API
 * @returns {string} User-friendly error message
 */
function parseErrorMessage(status, responseData) {
  // If the backend returned a specific error message, inspect it
  if (responseData && typeof responseData === 'object') {
    if (responseData.message) return responseData.message;
    if (responseData.error) return responseData.error;
    if (Array.isArray(responseData.details) && responseData.details.length > 0) {
      return responseData.details.map(d => d.message || d.field).join(', ');
    }
  }

  // Fallback messages based on HTTP status codes
  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input data.';
    case 401:
      return 'Your session has expired or you are not authorized. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict: You already have this book on loan or the state has changed.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    case 500:
    case 502:
    case 503:
      return 'The server encountered an error. Please try again later.';
    default:
      return 'An unexpected error occurred. Please check your connection and try again.';
  }
}

/**
 * Core fetch wrapper with auth header injection and error handling.
 * 
 * @param {string} endpoint - API path (e.g. "/books" or "/loans/my-loans")
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Parsed response data
 */
async function request(endpoint, options = {}) {
  // Ensure endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  // Build headers
  const headers = {
    'Accept': 'application/json',
    ...options.headers
  };

  // If sending body and Content-Type not specified, default to JSON
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Automatically attach Authorization header from cookie if token exists
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
    console.error('[API] Network connection failure:', networkError);
    throw new ApiError(
      'Unable to connect to the library server. Please check your internet connection.',
      0,
      networkError
    );
  }

  // Attempt to parse JSON response
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseError) {
      console.warn('[API] Could not parse JSON response:', parseError);
    }
  }

  // Check HTTP response status
  if (!response.ok) {
    // If token is invalid or expired (401) on a protected route, trigger logout
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      console.warn('[API] Received 401 Unauthorized - Session expired.');
      // Give a tiny grace time for user to see notice if needed, or redirect
      setTimeout(() => logout(), 500);
    }

    const message = parseErrorMessage(response.status, data);
    console.error(`[API] Request failed [${response.status} ${cleanEndpoint}]:`, message, data);
    throw new ApiError(message, response.status, data);
  }

  return data;
}

/**
 * High-level API client object
 */
export const api = {
  /**
   * Performs an HTTP GET request.
   */
  get(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'GET'
    });
  },

  /**
   * Performs an HTTP POST request.
   */
  post(endpoint, body = null, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }
};
