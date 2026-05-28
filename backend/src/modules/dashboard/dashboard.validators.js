/**
 * Validators for Dashboard inputs.
 * Currently, dashboard endpoints rely strictly on authenticated sessions and no body inputs.
 */

export const validateDashboardQuery = () => {
  return { error: null };
};
