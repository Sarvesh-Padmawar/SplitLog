import Joi from "joi";

/**
 * Validates inputs for user registration.
 */
export const validateRegisterInput = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().required().messages({
      "string.empty": "All fields are required",
      "any.required": "All fields are required",
    }),
    email: Joi.string().trim().email().required().messages({
      "string.empty": "All fields are required",
      "string.email": "Please provide a valid email address",
      "any.required": "All fields are required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.empty": "All fields are required",
      "string.min": "Password must be at least 6 characters long",
      "any.required": "All fields are required",
    }),
    username: Joi.string().trim().min(6).required().messages({
      "string.empty": "All fields are required",
      "string.min": "Username must be at least 6 characters long",
      "any.required": "All fields are required",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for user login.
 */
export const validateLoginInput = (data) => {
  const schema = Joi.object({
    emailOrUsername: Joi.string().trim().required().messages({
      "string.empty": "All fields are required",
      "any.required": "All fields are required",
    }),
    password: Joi.string().required().messages({
      "string.empty": "All fields are required",
      "any.required": "All fields are required",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for Google OAuth login/onboarding credential.
 */
export const validateGoogleLoginInput = (data) => {
  const schema = Joi.object({
    credential: Joi.string().required().messages({
      "string.empty": "Google credential is required",
      "any.required": "Google credential is required",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for profile completion.
 */
export const validateProfileCompletion = (data) => {
  const schema = Joi.object({
    username: Joi.string().trim().min(6).required().messages({
      "string.empty": "Username is required.",
      "any.required": "Username is required.",
      "string.min": "Username must be at least 6 characters.",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for email verification.
 */
export const validateVerifyEmailInput = (data) => {
  const schema = Joi.object({
    token: Joi.string().required().messages({
      "string.empty": "Verification token is missing.",
      "any.required": "Verification token is missing.",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for resending verification email.
 */
export const validateResendVerificationInput = (data) => {
  const schema = Joi.object({
    email: Joi.string().trim().email().required().messages({
      "string.empty": "Email is required.",
      "any.required": "Email is required.",
      "string.email": "Please provide a valid email address",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for requesting password reset.
 */
export const validateForgotPasswordInput = (data) => {
  const schema = Joi.object({
    email: Joi.string().trim().email().required().messages({
      "string.empty": "Email is required.",
      "any.required": "Email is required.",
      "string.email": "Please provide a valid email address",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for resetting password.
 */
export const validateResetPasswordInput = (data) => {
  const schema = Joi.object({
    token: Joi.string().trim().required().messages({
      "string.empty": "Token and new password are required.",
      "any.required": "Token and new password are required.",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.empty": "Token and new password are required.",
      "any.required": "Token and new password are required.",
      "string.min": "Password must be at least 6 characters.",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};
