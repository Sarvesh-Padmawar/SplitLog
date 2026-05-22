import { ApiError } from "../utils/ApiError.js";

/**
 * Global Error Handling Middleware
 * 
 * @description
 * Catches all errors forwarded via `next(err)` in Express.
 * Normalizes Mongoose, JWT, and generic errors into a standard format.
 * Hides stack traces and sensitive details in production environments.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of our custom ApiError,
  // we need to convert it into one for a standardized response.
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error instanceof Error ? 400 : 500;
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  /* --- Mongoose & DB Error Normalization --- */

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    error = new ApiError(400, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = `Duplicate field value entered: ${Object.keys(err.keyValue).join(", ")}`;
    error = new ApiError(400, message);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message).join(", ");
    error = new ApiError(400, message);
  }

  /* --- JWT Error Normalization --- */

  // Wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = "JSON Web Token is invalid. Try again!";
    error = new ApiError(401, message);
  }

  // JWT EXPIRED error
  if (err.name === "TokenExpiredError") {
    const message = "JSON Web Token is expired. Try again!";
    error = new ApiError(401, message);
  }

  /* --- Send Response --- */

  const response = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    ...(error.errors?.length > 0 && { errors: error.errors }),
  };

  // In production, prevent leaking unknown programming errors to the client
  if (process.env.NODE_ENV === "production" && !error.isOperational) {
    console.error("🔥 FATAL ERROR: ", err);
    response.message = "Internal Server Error";
  } else if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  return res.status(error.statusCode || 500).json(response);
};
