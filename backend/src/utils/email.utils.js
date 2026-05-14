/**
 * email.utils.js
 * ──────────────
 * Nodemailer transporter + helper functions for sending auth-related emails.
 *
 * Required environment variables:
 *   EMAIL_HOST   – SMTP host         (e.g. smtp.gmail.com)
 *   EMAIL_PORT   – SMTP port         (e.g. 587 for TLS / 465 for SSL)
 *   EMAIL_USER   – SMTP login        (your Gmail address / email account)
 *   EMAIL_PASS   – SMTP password     (Gmail App Password, NOT your account password)
 *   EMAIL_FROM   – Display name + address  (e.g. "SplitLog <you@gmail.com>")
 *   CLIENT_URL   – Frontend base URL (e.g. http://localhost:3000)
 *
 * Tip for local development without a real SMTP account:
 *   Use https://ethereal.email – it gives you a free preview inbox.
 */

import nodemailer from "nodemailer";

// ── sendVerificationEmail ──────────────────────────────────────────────────
/**
 * Sends an email-verification link to a newly registered user.
 *
 * The transporter is created lazily (inside this function, not at module load
 * time) because in Node ESM all imports are hoisted before any code executes,
 * meaning dotenv.config() hasn't run yet when this module is first imported.
 * Creating the transporter here ensures process.env values are available.
 *
 * @param {string} to        – Recipient email address
 * @param {string} rawToken  – The crypto-random token (NOT the hash)
 */
export const sendVerificationEmail = async (to, rawToken) => {
  // Build transporter fresh each call so env vars are always current
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    family: 4, // Force IPv4 — Node 18+ prefers IPv6 which causes ECONNREFUSED on Windows
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Build the full verification URL that the user clicks in their inbox.
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify your SplitLog account",
    // Plain-text fallback for email clients that don't render HTML.
    text: `Hello,\n\nPlease verify your SplitLog account by visiting the link below:\n\n${verifyUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't create an account, you can safely ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your SplitLog account</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #4f46e5; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .body { padding: 36px 40px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
    .expire { font-size: 13px; color: #6b7280; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .url-fallback { word-break: break-all; color: #4f46e5; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>SplitLog</h1>
    </div>
    <div class="body">
      <p>Hi there 👋</p>
      <p>Thanks for registering! Click the button below to verify your email address and activate your account.</p>
      <div class="btn-wrap">
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </div>
      <p class="expire">⏱ This link expires in <strong>15 minutes</strong>.</p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="url-fallback">${verifyUrl}</p>
      <p>If you didn't create a SplitLog account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} SplitLog. All rights reserved.
    </div>
  </div>
</body>
</html>`,
  };

  // Throws on SMTP error — callers should handle this gracefully.
  await transporter.sendMail(mailOptions);
};

// ── sendPasswordResetEmail ─────────────────────────────────────────────────
/**
 * Sends a password-reset link to a user who requested it.
 *
 * @param {string} to        – Recipient email address
 * @param {string} rawToken  – The crypto-random token (NOT the hash)
 */
export const sendPasswordResetEmail = async (to, rawToken) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    family: 4,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset your SplitLog password",
    text: `Hello,\n\nWe received a request to reset your SplitLog password. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request a password reset, you can safely ignore this email — your password won't change.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your SplitLog password</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #dc2626; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .body { padding: 36px 40px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: #dc2626; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
    .expire { font-size: 13px; color: #6b7280; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .url-fallback { word-break: break-all; color: #dc2626; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>SplitLog</h1>
    </div>
    <div class="body">
      <p>Hi there 👋</p>
      <p>We received a request to reset your SplitLog password. Click the button below to choose a new one.</p>
      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p class="expire">⏱ This link expires in <strong>15 minutes</strong>.</p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="url-fallback">${resetUrl}</p>
      <p>If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} SplitLog. All rights reserved.
    </div>
  </div>
</body>
</html>`,
  };

  await transporter.sendMail(mailOptions);
};
