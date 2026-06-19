import User from "../../models/User.model.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Updates the user's profile display name.
 * @param {string} userId - The ID of the user to update.
 * @param {object} profileData - The update parameters.
 * @returns {object} The updated user object without sensitive fields.
 */
export const updateProfile = async (userId, { name }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.name = name;
  await user.save();

  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    isProfileComplete: user.isProfileComplete,
    isVerified: user.isVerified,
    provider: user.provider,
  };
};

/**
 * Updates the user's password after verifying the current password.
 * @param {string} userId - The ID of the authenticated user.
 * @param {object} passwordData - Current and new passwords.
 * @returns {object} Success response.
 */
export const updatePassword = async (userId, { currentPassword, newPassword }) => {
  const { default: bcrypt } = await import("bcrypt");
  
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Google OAuth users do not have a password
  if (user.provider === "google" && !user.password) {
    throw new ApiError(400, "Google accounts do not have a password to update.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Incorrect current password.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  // Send security email notification
  try {
    const { sendPasswordChangedEmail } = await import("../../utils/email.utils.js");
    await sendPasswordChangedEmail(user.email);
  } catch (emailErr) {
    console.error("[UserService] Failed to send password changed email:", emailErr.message);
  }

  return { success: true };
};
