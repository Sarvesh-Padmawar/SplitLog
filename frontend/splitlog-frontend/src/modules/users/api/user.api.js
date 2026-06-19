import api from "../../../shared/services/axios";

/**
 * User API Service
 * Handles HTTP requests related to user settings/profile.
 */
export const userApi = {
  updateProfile: async (payload) => {
    const response = await api.patch("/users/me/profile", payload);
    return response.data;
  },

  updatePassword: async (payload) => {
    const response = await api.patch("/users/me/password", payload);
    return response.data;
  },
};
