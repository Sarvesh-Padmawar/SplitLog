import User from "../../models/User.model.js";
import { ApiError } from "../../utils/ApiError.js";
import cloudinary from "../../config/cloudinary.js";

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
    id: user._id,
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    isProfileComplete: user.isProfileComplete,
    isVerified: user.isVerified,
    provider: user.provider,
    avatar: user.avatar,
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

/**
 * Uploads a user's avatar image to Cloudinary and saves the metadata to the user model.
 * If an old avatar exists, it is deleted from Cloudinary first.
 * @param {string} userId - The ID of the authenticated user.
 * @param {Buffer} fileBuffer - The memory buffer of the uploaded file.
 * @returns {object} The updated user details including the avatar.
 */
export const updateAvatar = async (userId, fileBuffer) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 1. Delete previous Cloudinary image if it exists
  if (user.avatar && user.avatar.publicId) {
    try {
      console.log(`[UserService] Deleting old avatar from Cloudinary: ${user.avatar.publicId}`);
      await cloudinary.uploader.destroy(user.avatar.publicId);
    } catch (destroyErr) {
      console.error("[UserService] Failed to delete old Cloudinary image:", destroyErr?.message || destroyErr);
      // Don't throw error to allow user to still upload a new one
    }
  }

  // 2. Upload new image using stream upload
  let uploadResult;
  try {
    uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "splitlog/avatars",
          transformation: [
            { width: 300, height: 300, crop: "fill" }
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(fileBuffer);
    });
  } catch (uploadErr) {
    console.error("[UserService] Cloudinary upload failed:", uploadErr);
    throw new ApiError(500, "Failed to upload image to Cloudinary.");
  }

  // 3. Save new avatar metadata in User document
  user.avatar = {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  };
  await user.save();

  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    isProfileComplete: user.isProfileComplete,
    isVerified: user.isVerified,
    provider: user.provider,
    avatar: user.avatar,
  };
};
