/**
 * Validators for History inputs.
 * Follows the same pattern as other modular validators in SplitLog.
 */

export const validateGetHistoryInput = ({ friendId }) => {
  if (!friendId) {
    return { error: "Friend ID is required" };
  }
  return { error: null };
};
