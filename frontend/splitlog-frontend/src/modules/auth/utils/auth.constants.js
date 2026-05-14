export const AUTH_ROUTES = {
  LOGIN: "/login",
  REGISTER: "/signup",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  COMPLETE_PROFILE: "/complete-profile",
  DASHBOARD: "/",
};

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  REGISTER_SUCCESS: "Registration successful! Please check your email.",
  PROFILE_COMPLETE_SUCCESS: "Profile completed successfully.",
  EMAIL_VERIFIED: "Email verified successfully!",
  VERIFICATION_RESENT: "Verification email resent! Check your inbox.",
  RESET_LINK_SENT: "Password reset link sent.",
  PASSWORD_RESET_SUCCESS: "Password reset successfully.",
  INVALID_CREDENTIALS: "Login failed. Please check your credentials.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
};

export const AUTH_PROVIDERS = {
  LOCAL: "local",
  GOOGLE: "google",
};
