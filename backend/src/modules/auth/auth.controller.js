import {
  createUser,
  authenticateUser,
  getUserById,
  verifyEmailToken,
  createAndSendVerificationToken,
  createAndSendPasswordResetToken,
  resetUserPassword
} from "./auth.service.js";

import {
  verifyGoogleToken,
  linkOrCreateGoogleUser,
  completeUserProfile
} from "./googleAuth.service.js";

import {
  validateRegisterInput,
  validateLoginInput,
  validateProfileCompletion,
  validateResetPasswordInput
} from "./auth.validators.js";

import { generateToken } from "./auth.utils.js";

// ── REGISTER ───────────────────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const validation = validateRegisterInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    await createUser(req.body);

    return res.status(201).json({
      message: "Registration successful! Please check your email and click the verification link to activate your account.",
    });
  } catch (error) {
    const status = error.status || 500;
    console.error("Register error:", error);
    return res.status(status).json({ message: status === 500 ? "Server error. Please try again." : error.message });
  }
};

// ── LOGIN ──────────────────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const validation = validateLoginInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const user = await authenticateUser(req.body);

    // Set HTTP-only JWT cookie
    generateToken(user._id, res);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        provider: user.provider || "local",
        isProfileComplete: user.isProfileComplete !== false,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    console.error("Login error:", error);
    return res.status(status).json({ message: status === 500 ? "Server error. Please try again." : error.message });
  }
};

// ── GOOGLE LOGIN ───────────────────────────────────────────────────────────
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const payload = await verifyGoogleToken(credential);
    const user = await linkOrCreateGoogleUser({
      email: payload.email,
      name: payload.name,
      googleId: payload.sub,
    });

    generateToken(user._id, res);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        username: user.isProfileComplete !== false ? user.username : null,
        email: user.email,
        provider: user.provider || (user.googleId ? "google" : "local"),
        isProfileComplete: user.isProfileComplete !== false,
      },
    });
  } catch (error) {
    console.error("Error in Google Login:", error);
    return res.status(500).json({ message: "Server error during Google Authentication." });
  }
};

// ── LOGOUT ─────────────────────────────────────────────────────────────────
export const logoutUser = (req, res) => {
  res.cookie("jwt", "", {
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ message: "Logged out successfully" });
};

// ── GET ME ─────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user);

    return res.status(200).json({
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      provider: user.provider || "local",
      isProfileComplete: user.isProfileComplete !== false,
    });
  } catch (error) {
    const status = error.status || 500;
    console.error("GetMe error:", error);
    return res.status(status).json({ message: status === 500 ? "Server error. Please try again." : error.message });
  }
};

// ── COMPLETE PROFILE (ONBOARDING) ──────────────────────────────────────────
export const completeProfile = async (req, res) => {
  try {
    const validation = validateProfileCompletion(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const user = await completeUserProfile(req.user, req.body.username);

    return res.status(200).json({
      message: "Profile completed successfully.",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        provider: user.provider || "local",
        isProfileComplete: user.isProfileComplete !== false,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Server error. Please try again." });
  }
};

// ── VERIFY EMAIL ───────────────────────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Verification token is missing." });
    }

    await verifyEmailToken(token);

    return res.status(200).json({
      message: "Email verified successfully! You can now log in to your account.",
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Server error. Please try again." });
  }
};

// ── RESEND VERIFICATION EMAIL ──────────────────────────────────────────────
export const resendVerificationEmail = async (req, res) => {
  const GENERIC_RESPONSE = {
    message: "If an unverified account with that email exists, a new verification link has been sent.",
  };

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    await createAndSendVerificationToken(email);

    return res.status(200).json(GENERIC_RESPONSE);
  } catch (error) {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── FORGOT PASSWORD ────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const GENERIC_RESPONSE = {
    message: "If an account with that email exists, a password reset link has been sent.",
  };

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    await createAndSendPasswordResetToken(email);

    return res.status(200).json(GENERIC_RESPONSE);
  } catch (error) {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── RESET PASSWORD ─────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const validation = validateResetPasswordInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    await resetUserPassword(req.body.token, req.body.newPassword);

    return res.status(200).json({
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Server error. Please try again." });
  }
};
