/**
 * Reusable Frontend API Response Helpers
 * Defensively extracts data payload and pagination structures from API responses.
 * Provides backwards-compatibility for raw arrays and handles standard envelopes seamlessly.
 */

/**
 * Extracts the primary data payload from an API response.
 * Handles Axios response objects, standardized wrappers, legacy array structures, and fallback defaults.
 * 
 * @param {Object} response - Axios response object or raw data payload
 * @param {*} [fallback=[]] - Fallback value if no valid data is found
 * @returns {*} The extracted data payload (guaranteed array if fallback is an array)
 */
export const extractData = (response, fallback = []) => {
  if (!response) return fallback;

  // Extract nested data payload if this is a standard Axios response envelope
  const payload = response.data !== undefined ? response.data : response;

  if (payload && typeof payload === "object") {
    // Standard response: { success: true, data: [...] }
    if (payload.success === true && payload.data !== undefined) {
      return payload.data;
    }
    // Backward-compatibility: { success: true, items: [...] }
    if (payload.items !== undefined) {
      return payload.items;
    }
    // Direct array or object
    return payload;
  }

  return payload !== undefined ? payload : fallback;
};

/**
 * Extracts pagination metadata from an API response.
 * 
 * @param {Object} response - Axios response object or raw data payload
 * @returns {Object|null} Pagination metadata or null
 */
export const extractPagination = (response) => {
  if (!response) return null;

  const payload = response.data !== undefined ? response.data : response;

  if (payload && typeof payload === "object" && payload.pagination) {
    return payload.pagination;
  }

  return null;
};
