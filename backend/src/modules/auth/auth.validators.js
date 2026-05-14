/**
 * Validators for authentication inputs.
 * These keep the controllers clean from raw if-else checks on strings.
 */

export const validateRegisterInput = ({ name, username, email, password }) => {
  if (!name || !username || !email || !password) {
    return { error: "All fields are required" };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long" };
  }
  if (username.length < 6) {
    return { error: "Username must be at least 6 characters long" };
  }
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please provide a valid email address" };
  }
  return { error: null };
};

export const validateLoginInput = ({ emailOrUsername, password }) => {
  if (!emailOrUsername || !password) {
    return { error: "All fields are required" };
  }
  return { error: null };
};

export const validateProfileCompletion = ({ username }) => {
  if (!username) {
    return { error: "Username is required." };
  }
  if (username.length < 6) {
    return { error: "Username must be at least 6 characters." };
  }
  return { error: null };
};

export const validateResetPasswordInput = ({ token, newPassword }) => {
  if (!token || !newPassword) {
    return { error: "Token and new password are required." };
  }
  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  return { error: null };
};
