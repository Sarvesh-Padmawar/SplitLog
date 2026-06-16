import Joi from "joi";

/**
 * Custom helper to validate MongoDB ObjectIds in schemas.
 */
const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid MongoDB ObjectId');
  }
  return value;
};

/**
 * Validates inputs for creating a new group.
 */
export const validateCreateGroup = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(50).required().messages({
      "string.empty": "Group name is required",
      "string.min": "Group name must be at least 3 characters",
      "string.max": "Group name cannot exceed 50 characters",
      "any.required": "Group name is required",
    }),
    description: Joi.string().trim().max(200).allow("").messages({
      "string.max": "Description cannot exceed 200 characters",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for updating an existing group's basic details.
 */
export const validateUpdateGroup = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(50).required().messages({
      "string.empty": "Group name is required",
      "string.min": "Group name must be at least 3 characters",
      "string.max": "Group name cannot exceed 50 characters",
      "any.required": "Group name is required",
    }),
    description: Joi.string().trim().max(200).allow("").messages({
      "string.max": "Description cannot exceed 200 characters",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for adding a member to a group.
 */
export const validateAddMember = (data) => {
  const schema = Joi.object({
    userId: Joi.string().custom(objectId).required().messages({
      "string.empty": "User ID is required",
      "any.required": "User ID is required",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};

/**
 * Validates inputs for creating a new group expense.
 */
export const validateCreateGroupExpense = (data) => {
  const schema = Joi.object({
    totalAmount: Joi.number().positive().required().messages({
      "number.base": "Total amount must be a number",
      "number.positive": "Total amount must be greater than zero",
      "any.required": "Total amount is required",
    }),
    description: Joi.string().trim().required().messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),
    category: Joi.string().trim().lowercase().valid("food", "travel", "rent", "shopping", "other").default("other").messages({
      "any.only": "Invalid category. Must be one of: food, travel, rent, shopping, other",
    }),
    splits: Joi.array().items(
      Joi.object({
        user: Joi.string().custom(objectId).required().messages({
          "string.empty": "Split user ID is required",
          "any.required": "Split user ID is required",
        }),
        amount: Joi.number().positive().required().messages({
          "number.base": "Split amount must be a number",
          "number.positive": "Split amount must be greater than zero",
          "any.required": "Split amount is required",
        }),
      })
    ).min(1).required().messages({
      "array.min": "At least one split is required",
      "any.required": "Splits array is required",
    }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    return { error: error.details[0].message };
  }
  return { error: null, value };
};