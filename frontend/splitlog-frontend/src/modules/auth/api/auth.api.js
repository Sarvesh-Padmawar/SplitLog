import api from "../../../shared/services/axios";

/**
 * Auth API Service
 * Handles all raw HTTP requests to the backend for authentication.
 * No business logic should reside here.
 */
export const authApi = {
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/auth/loginUser", credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  googleLogin: async (credential) => {
    const response = await api.post("/auth/google", { credential });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logoutUser");
    return response.data;
  },

  completeProfile: async (username) => {
    const response = await api.post("/auth/complete-profile", { username });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (data) => {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  },
};
