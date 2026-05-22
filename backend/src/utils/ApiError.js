/**
 * @class ApiError
 * @extends Error
 * 
 * @description
 * A custom error class to standardize all operational API errors.
 * Distinguishes expected (operational) errors from unexpected programming bugs.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
   * @param {string} message - User-friendly error message
   * @param {Array} errors - Optional array of multiple errors (e.g., validation errors)
   * @param {string} stack - Optional custom stack trace
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    
    // Flag to indicate this is a trusted, operational error we intentionally threw
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
