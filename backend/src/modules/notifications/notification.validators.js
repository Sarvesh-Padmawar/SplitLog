/**
 * Validators for Notification inputs.
 * Follows the same pattern as other modular validators in SplitLog.
 */

export const validateSettlementResponseInput = ({ status }) => {
  if (!status) {
    return { error: "Status is required" };
  }
  if (!["accepted", "rejected"].includes(status)) {
    return { error: "Status must be either accepted or rejected" };
  }
  return { error: null };
};
