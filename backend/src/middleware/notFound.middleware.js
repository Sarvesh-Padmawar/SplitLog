import { ApiError } from "../utils/ApiError.js";

/**
 * 404 Not Found Middleware
 * 
 * @description
 * Catches all requests to unhandled or non-existent routes.
 * Throws a 404 ApiError which gets forwarded to the global error handler.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found - ${req.originalUrl}`);
  next(error);
};
