/**
 * Validators for Friend inputs.
 * Follows the same pattern as other modular validators in SplitLog.
 */

export const validateSendRequestInput = ({ toUserId }) => {
  if (!toUserId) {
    return { error: "User ID is required" };
  }
  return { error: null };
};

export const validateActionRequestInput = ({ requestId }) => {
  if (!requestId) {
    return { error: "Request ID is required" };
  }
  return { error: null };
};
