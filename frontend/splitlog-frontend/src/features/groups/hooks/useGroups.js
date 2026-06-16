import { useState, useCallback } from "react";
import { groupApi } from "../services/groupApi";

/**
 * useGroups Hook
 * Provides React state management and actions for groups and group details.
 */
export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [groupDetails, setGroupDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [groupExpenses, setGroupExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState(null);

  const [groupBalances, setGroupBalances] = useState([]);
  const [groupSettlements, setGroupSettlements] = useState([]);
  const [totalGroupExpenses, setTotalGroupExpenses] = useState(0);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balancesError, setBalancesError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  /**
   * Fetches all groups for the logged-in user.
   */
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await groupApi.getGroups();
      // Inspect response structure. The backend returns { success: true, message: '...', data: groups }
      setGroups(response.data || []);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to load groups. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches detailed information for a single group.
   */
  const fetchGroupDetails = useCallback(async (groupId) => {
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const response = await groupApi.getGroupDetails(groupId);
      // The backend returns { success: true, message: '...', data: group }
      setGroupDetails(response.data || null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to load group details. Please try again.";
      setDetailsError(errorMsg);
      throw err;
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  /**
   * Creates a new group.
   */
  const createGroup = async (groupData) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await groupApi.createGroup(groupData);
      // Backend returns { success: true, message: '...', data: createdGroup }
      const newGroup = response.data;
      if (newGroup) {
        setGroups((prev) => [newGroup, ...prev]);
      }
      return { success: true, data: newGroup };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create group. Please try again.";
      setActionError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Adds a member by user ID to a group.
   */
  const addMember = async (groupId, userId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await groupApi.addMember(groupId, userId);
      // Backend returns { success: true, message: '...', data: updatedGroup }
      const updatedGroup = response.data;
      if (updatedGroup && groupDetails && groupDetails._id === groupId) {
        setGroupDetails(updatedGroup);
      }
      return { success: true, data: updatedGroup };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to add member. Please try again.";
      setActionError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Removes a member from a group.
   */
  const removeMember = async (groupId, userId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await groupApi.removeMember(groupId, userId);
      // Backend returns { success: true, message: '...', data: updatedGroup }
      const updatedGroup = response.data;
      if (updatedGroup && groupDetails && groupDetails._id === groupId) {
        setGroupDetails(updatedGroup);
      }
      return { success: true, data: updatedGroup };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to remove member. Please try again.";
      setActionError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Fetches all expenses for a group.
   */
  const fetchGroupExpenses = useCallback(async (groupId) => {
    setLoadingExpenses(true);
    setExpensesError(null);
    try {
      const response = await groupApi.getGroupExpenses(groupId);
      setGroupExpenses(response.data || []);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to load group expenses. Please try again.";
      setExpensesError(errorMsg);
      throw err;
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  /**
   * Creates a new group expense.
   */
  const createGroupExpense = async (groupId, payload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await groupApi.createGroupExpense(groupId, payload);
      const newExpense = response.data;
      if (newExpense) {
        setGroupExpenses((prev) => [newExpense, ...prev]);
      }
      return { success: true, data: newExpense };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create group expense. Please try again.";
      setActionError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Fetches the net balances and settlements summary for a group.
   */
  const fetchGroupBalances = useCallback(async (groupId) => {
    setLoadingBalances(true);
    setBalancesError(null);
    try {
      const response = await groupApi.getGroupBalances(groupId);
      const data = response.data || {};
      setTotalGroupExpenses(data.totalExpenses || 0);
      setGroupBalances(data.memberBalances || []);
      setGroupSettlements(data.settlements || []);
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to calculate group balances. Please try again.";
      setBalancesError(errorMsg);
      throw err;
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  return {
    groups,
    loading,
    error,
    fetchGroups,

    groupDetails,
    setGroupDetails,
    loadingDetails,
    detailsError,
    fetchGroupDetails,

    groupExpenses,
    loadingExpenses,
    expensesError,
    fetchGroupExpenses,

    groupBalances,
    groupSettlements,
    totalGroupExpenses,
    loadingBalances,
    balancesError,
    fetchGroupBalances,

    actionLoading,
    actionError,
    createGroup,
    addMember,
    removeMember,
    createGroupExpense,
  };
}
