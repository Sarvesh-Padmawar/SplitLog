import axios from "axios";

/**
 * Centralized Axios Instance
 * Used across the entire application for all API calls.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Required for HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for global error handling (e.g., 401s)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can add global 401 unauthenticated handling here later
    // if (error.response?.status === 401) { ... }
    return Promise.reject(error);
  }
);

export default api;
