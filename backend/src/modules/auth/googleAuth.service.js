import { OAuth2Client } from "google-auth-library";
import User from "../../models/User.model.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies the Google credential token and returns the payload.
 */
export const verifyGoogleToken = async (credential) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return ticket.getPayload(); // contains { email, name, sub }
};

/**
 * Finds an existing user by email to link their Google ID,
 * or creates a new user with a dummy username.
 */
export const linkOrCreateGoogleUser = async ({ email, name, googleId }) => {
  let user = await User.findOne({ email });

  if (user) {
    // If user exists but doesn't have a googleId, link it
    if (!user.googleId) {
      user.googleId = googleId;
      // Google verified their email, so auto-verify if they haven't yet
      user.isVerified = true;
      await user.save();
    }
  } else {
    // Create new user with dummy username
    const dummyUsername = `google_${googleId}_${Date.now()}`;
    
    user = await User.create({
      name,
      email,
      username: dummyUsername,
      googleId,
      isVerified: true, // Google verifies emails
      isProfileComplete: false,
      provider: "google",
    });
  }

  return user;
};

/**
 * Completes a user's profile by setting their username.
 * Throws errors if already complete or if username is taken.
 */
export const completeUserProfile = async (userId, username) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  if (user.isProfileComplete) {
    const error = new Error("Profile is already complete.");
    error.status = 400;
    throw error;
  }

  const existingUser = await User.findOne({ username: username.toLowerCase() });
  if (existingUser) {
    const error = new Error("Username is already taken.");
    error.status = 400;
    throw error;
  }

  user.username = username.toLowerCase();
  user.isProfileComplete = true;
  await user.save();

  return user;
};
