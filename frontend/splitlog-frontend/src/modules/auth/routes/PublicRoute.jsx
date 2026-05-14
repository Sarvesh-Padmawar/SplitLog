import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AUTH_ROUTES } from "../utils/auth.constants";

export function PublicRoute({ children }) {
  const { user, isAuthenticated, initialized } = useAuth();

  // 1. Wait for initial auth check
  if (!initialized) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-surface-300">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 2. If authenticated, block access to public routes (like login/register)
  if (isAuthenticated) {
    // If they haven't completed their profile, send them there instead of dashboard
    if (user.isProfileComplete === false) {
      return <Navigate to={AUTH_ROUTES.COMPLETE_PROFILE} replace />;
    }
    return <Navigate to={AUTH_ROUTES.DASHBOARD} replace />;
  }

  // 3. Not authenticated, render public route
  return children;
}
