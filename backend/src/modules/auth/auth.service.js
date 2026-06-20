import bcrypt from "bcrypt";
import User from "../../models/User.model.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../utils/email.utils.js";
import { createVerificationTokenPair, hashToken } from "./auth.utils.js";

/**
 * Creates a new user in the database and sends a verification email.
 * Throws an error if the user already exists.
 */
export const createUser = async ({ name, username, email, password }) => {
  // Check if user exists
  const userExist = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (userExist) {
    const error = new Error("Registration failed. Please check your details and try again.");
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const { rawToken, tokenHash } = createVerificationTokenPair();

  const user = await User.create({
    name,
    username,
    email,
    password: hashedPassword,
    isVerified: false,
    verificationToken: tokenHash,
    verificationTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  });

  // Fire-and-forget email sending
  try {
    await sendVerificationEmail(user.email, rawToken);
  } catch (emailErr) {
    console.error("Failed to send verification email:", emailErr.message);
  }

  return user;
};

/**
 * Authenticates a user by email/username and password.
 * Throws an error if credentials are invalid or if unverified.
 */
export const authenticateUser = async ({ emailOrUsername, password }) => {
  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error("Please verify your email before logging in. Check your inbox or request a new verification link.");
    error.status = 403;
    throw error;
  }

  return user;
};

/**
 * Fetches a user by ID, selecting specific fields.
 */
export const getUserById = async (userId) => {
  const user = await User.findById(userId).select("_id name username email isProfileComplete avatar");
  if (!user) {
    const error = new Error("User not found");
    error.status = 401;
    throw error;
  }
  return user;
};

/**
 * Verifies a user's email given a raw token from the URL.
 */
export const verifyEmailToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);

  const user = await User.findOne({
    verificationToken: tokenHash,
    verificationTokenExpiry: { $gt: new Date() }, // must be in the future
  }).select("+verificationToken +verificationTokenExpiry");

  if (!user) {
    const error = new Error("Invalid or expired verification link. Please request a new one.");
    error.status = 400;
    throw error;
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save();

  return user;
};

/**
 * Generates a new verification token for an existing unverified user and emails it.
 */
export const createAndSendVerificationToken = async (email) => {
  const user = await User.findOne({ email }).select("+verificationToken +verificationTokenExpiry");

  // Only send if the account exists AND is not already verified.
  if (user && !user.isVerified) {
    const { rawToken, tokenHash } = createVerificationTokenPair();

    user.verificationToken = tokenHash;
    user.verificationTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(user.email, rawToken);
    } catch (emailErr) {
      console.error("Failed to resend verification email:", emailErr.message);
    }
  }
  // We return nothing to maintain the generic response security (email oracle protection)
};

/**
 * Generates a password reset token and emails it to the user if they exist.
 */
export const createAndSendPasswordResetToken = async (email) => {
  const user = await User.findOne({ email });

  if (user) {
    const { rawToken, tokenHash } = createVerificationTokenPair();
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, rawToken);
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr.message);
    }
  }
};

/**
 * Resets a user's password using the token provided in the email link.
 */
export const resetUserPassword = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);

  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpiry: { $gt: new Date() },
  }).select("+resetPasswordToken +resetPasswordExpiry");

  if (!user) {
    const error = new Error("Invalid or expired password reset link. Please request a new one.");
    error.status = 400;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  return user;
};
