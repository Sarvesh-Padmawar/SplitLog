import Joi from "joi";

/**
 * Validates inputs for updating profile info.
 */
export const validateUpdateProfileInput = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).required().messages({
      "string.empty": "Name cannot be empty.",
      "any.required": "Name is required.",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for updating password.
 */
export const validateUpdatePasswordInput = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required.",
      "any.required": "Current password is required.",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.empty": "New password is required.",
      "string.min": "New password must be at least 6 characters long.",
      "any.required": "New password is required.",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};
