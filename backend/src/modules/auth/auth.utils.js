import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Creates a cryptographically secure token pair:
 *  - rawToken  → sent to the user (inside the email link)
 *  - tokenHash → stored in the database (never the raw token)
 *
 * Using SHA-256 on a 32-byte CSPRNG value gives us a token that is:
 *  • Unpredictable (crypto.randomBytes)
 *  • Safe to store as a hash (one-way; attacker with DB access can't reverse it)
 */
export const createVerificationTokenPair = () => {
  const rawToken = crypto.randomBytes(32).toString("hex"); // 64-char hex string
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  return { rawToken, tokenHash };
};

/**
 * Hashes a given raw token using SHA-256 (used for comparing incoming tokens).
 */
export const hashToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Generates a JWT for the user and sets it as an HTTP-only cookie.
 */
export const generateToken = (userId, res) => {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return token;
};
