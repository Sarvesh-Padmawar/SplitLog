/**
 * @function asyncHandler
 * 
 * @description
 * A higher-order function that wraps async Express route handlers and controllers.
 * It eliminates the need for repetitive try/catch blocks by automatically catching
 * any rejected promises and passing the error to the global error middleware via `next()`.
 * 
 * @param {Function} requestHandler - The async Express controller function
 * @returns {Function} - An Express middleware function
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
