import { createContext, useEffect, useState, useMemo, useCallback } from "react";
import { authApi } from "../api/auth.api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize Auth State on Mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const data = await authApi.getCurrentUser();
        // Since backend responds with { id, name, username, email, isProfileComplete, provider }
        // we set it as the user object.
        if (isMounted) setUser(data);
      } catch (error) {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Set user state globally (e.g. after login/register/google)
  const setAuthUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  // Clear user state globally (e.g. after logout)
  const clearAuthUser = useCallback(() => {
    setUser(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consuming components
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      initialized,
      setAuthUser,
      clearAuthUser,
    }),
    [user, loading, initialized, setAuthUser, clearAuthUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
