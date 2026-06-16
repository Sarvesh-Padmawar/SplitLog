import api from "../../../shared/services/axios";

/**
 * Group API Service
 * Handles all network requests for the Groups feature.
 */
export const groupApi = {
  /**
   * Fetch all groups the logged-in user is a member of.
   * GET /api/groups
   */
  getGroups: async () => {
    const response = await api.get("/groups");
    return response.data;
  },

  /**
   * Create a new group.
   * POST /api/groups
   * Body: { name, description }
   */
  createGroup: async (groupData) => {
    const response = await api.post("/groups", groupData);
    return response.data;
  },

  /**
   * Fetch detailed group information, including populated member data.
   * GET /api/groups/:groupId
   */
  getGroupDetails: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  /**
   * Add a member to a group by their user ID.
   * POST /api/groups/:groupId/members
   * Body: { userId }
   */
  addMember: async (groupId, userId) => {
    const response = await api.post(`/groups/${groupId}/members`, { userId });
    return response.data;
  },

  /**
   * Remove a member from a group.
   * DELETE /api/groups/:groupId/members/:userId
   */
  removeMember: async (groupId, userId) => {
    const response = await api.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  /**
   * Fetch all expenses belonging to a group.
   * GET /api/groups/:groupId/expenses
   */
  getGroupExpenses: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/expenses`);
    return response.data;
  },

  /**
   * Create a new group expense.
   * POST /api/groups/:groupId/expenses
   */
  createGroupExpense: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/expenses`, payload);
    return response.data;
  },

  /**
   * Fetch net balances and settlements for a group.
   * GET /api/groups/:groupId/balances
   */
  getGroupBalances: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/balances`);
    return response.data;
  },
};
