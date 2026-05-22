/**
 * Centralized Pagination Utilities
 * Provides reusable functions to parse query parameters, calculate limits, and build standardized metadata.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Extracts and sanitizes pagination parameters from the request query.
 * Enforces a maximum limit to prevent abuse.
 * 
 * @param {Object} query - Express req.query object
 * @param {number} [defaultLimit=10] - Optional default limit
 * @returns {Object} { page, limit, skip }
 */
export const getPaginationParams = (query, defaultLimit = DEFAULT_LIMIT) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Fallbacks for invalid values
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;

  // Max limit protection
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Builds the standardized pagination metadata object.
 * 
 * @param {number} totalItems - Total matching documents in the database
 * @param {number} page - Current page number
 * @param {number} limit - Current limit per page
 * @returns {Object} Pagination metadata block
 */
export const buildPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Helper function to wrap paginated responses.
 * 
 * @param {Array} data - The array of retrieved documents
 * @param {Object} meta - The pagination metadata
 * @returns {Object} Standardized API response
 */
export const buildPaginatedResponse = (data, meta) => {
  return {
    success: true,
    // TODO: Remove `items` after frontend migration is complete
    // Legacy alias for frontend mapping
    items: data,
    data,
    pagination: meta,
  };
};
