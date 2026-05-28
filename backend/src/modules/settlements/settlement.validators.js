/**
 * Validators for Settlement inputs.
 * Follows the same pattern as the Auth and Expenses modules.
 */

export const validateCreateSettlementInput = ({ friendId, amount }) => {
  if (!friendId) {
    return { error: "Friend ID is required" };
  }
  if (amount === undefined || amount === null) {
    return { error: "Settlement amount is required" };
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { error: "Invalid settlement amount" };
  }

  return { error: null };
};

export const validateRejectSettlementInput = ({ settlementId, reason }) => {
  if (!settlementId) {
    return { error: "Settlement ID is required" };
  }
  return { error: null };
};
