import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import * as userService from "./user.service.js";
import { validateUpdateProfileInput, validateUpdatePasswordInput } from "./user.validators.js";

/**
 * Controller endpoint to update the user's profile info (name).
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const validation = validateUpdateProfileInput(req.body);
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  // req.user contains the authenticated user's ID
  const updatedUser = await userService.updateProfile(req.user, req.body);

  return res.status(200).json({
    message: "Profile updated successfully.",
    user: updatedUser,
  });
});

/**
 * Controller endpoint to update the user's password.
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const validation = validateUpdatePasswordInput(req.body);
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  await userService.updatePassword(req.user, req.body);

  return res.status(200).json({
    message: "Password updated successfully.",
  });
});
