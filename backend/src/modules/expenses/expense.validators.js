/**
 * Validators for Expense inputs.
 * Follows the same pattern as the Auth module validators.
 */

export const validateAddExpenseInput = ({ totalAmount, splits = [], description, category }) => {
  if (totalAmount === undefined || totalAmount === null) {
    return { error: "Total amount is required" };
  }

  const parsedAmount = Number(totalAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { error: "Invalid total amount" };
  }

  if (splits && !Array.isArray(splits)) {
    return { error: "Splits must be an array" };
  }

  for (const split of splits) {
    if (!split.user) {
      return { error: "User ID is required for splits" };
    }
    if (split.amount === undefined || split.amount === null) {
      return { error: "Amount is required for splits" };
    }
    const parsedSplitVal = Number(split.amount);
    if (isNaN(parsedSplitVal) || parsedSplitVal <= 0) {
      return { error: "Invalid split amount" };
    }
  }

  if (category) {
    const validCategories = ["food", "travel", "rent", "shopping", "other"];
    if (!validCategories.includes(category.toLowerCase())) {
      return { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` };
    }
  }

  return { error: null };
};

export const validateRespondToSplitInput = ({ status }) => {
  if (!status) {
    return { error: "Status is required" };
  }
  if (!["accepted", "rejected"].includes(status)) {
    return { error: "Status must be either accepted or rejected" };
  }
  return { error: null };
};
