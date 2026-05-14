import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AUTH_ROUTES } from "../utils/auth.constants";

export function ProtectedRoute({ children, requireCompleteProfile = true }) {
  const { user, isAuthenticated, initialized } = useAuth();
  const location = useLocation();

  // 1. Wait for initial auth check
  if (!initialized) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-surface-300">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 2. If not authenticated, go to login
  if (!isAuthenticated) {
    // Optionally pass the current location to redirect back after login
    return <Navigate to={AUTH_ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // 3. If profile incomplete and this route requires it, go to complete-profile
  if (requireCompleteProfile && user.isProfileComplete === false) {
    return <Navigate to={AUTH_ROUTES.COMPLETE_PROFILE} replace />;
  }

  // 4. Authorized, render children
  return children;
}
