import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthProvider";
import { authApi } from "../api/auth.api";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user, isAuthenticated, loading, initialized, setAuthUser, clearAuthUser } = context;

  // Local loading state for auth actions (login/register/etc)
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to wrap API calls with loading/error state
  const executeAuthAction = async (actionFn) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await actionFn();
      return { success: true, data: result };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "An unexpected error occurred.";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setActionLoading(false);
    }
  };

  const login = async (credentials) => {
    return executeAuthAction(async () => {
      const data = await authApi.login(credentials);
      setAuthUser(data.user);
      return data;
    });
  };

  const register = async (userData) => {
    return executeAuthAction(async () => {
      const data = await authApi.register(userData);
      // Registration typically doesn't auto-login if email verification is required
      // The backend returns a success message (201)
      return data;
    });
  };

  const googleLogin = async (credential) => {
    return executeAuthAction(async () => {
      const data = await authApi.googleLogin(credential);
      setAuthUser(data.user);
      return data;
    });
  };

  const logout = async () => {
    return executeAuthAction(async () => {
      await authApi.logout();
      clearAuthUser();
      return true;
    });
  };

  const completeProfile = async (username) => {
    return executeAuthAction(async () => {
      const data = await authApi.completeProfile(username);
      setAuthUser(data.user);
      return data;
    });
  };

  return {
    user,
    isAuthenticated,
    loading,
    initialized,
    actionLoading,
    error,
    login,
    register,
    googleLogin,
    logout,
    completeProfile,
    clearError: () => setError(null),
  };
}
