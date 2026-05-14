/**
 * rateLimit.middleware.js
 * ───────────────────────
 * express-rate-limit configurations to guard auth endpoints against abuse.
 *
 * `authLimiter`   – Applied to /register and /loginUser (10 req / 15 min per IP)
 * `resendLimiter` – Applied to /resend-verification (3 req / 15 min per IP)
 */

import rateLimit from "express-rate-limit";

// ── Auth Limiter ───────────────────────────────────────────────────────────
// Prevents brute-force login attacks and mass registration.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per window per IP
  standardHeaders: true,     // Return RateLimit-* headers (draft-6)
  legacyHeaders: false,      // Disable X-RateLimit-* headers
  message: {
    message: "Too many attempts from this IP. Please try again in 15 minutes.",
  },
});

// ── Resend Limiter ─────────────────────────────────────────────────────────
// "Resend verification email" is more sensitive — keep the window tight.
export const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,                    // max 3 resend requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many resend requests. Please wait 15 minutes before trying again.",
  },
});

// ── Forgot Password Limiter ────────────────────────────────────────────────
// Prevents email bombing via the forgot-password endpoint.
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,                    // max 3 reset requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many password reset requests. Please wait 15 minutes before trying again.",
  },
});
