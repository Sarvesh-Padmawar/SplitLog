import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard/Dashboard";
import FriendDashboard from "./pages/FriendDashboard/Dashboard";
import Layout from "./components/layout/Layout";
import Login from "./modules/auth/pages/LoginPage";
import Signup from "./modules/auth/pages/RegisterPage";
import VerifyEmail from "./modules/auth/pages/VerifyEmailPage";
import ForgotPassword from "./modules/auth/pages/ForgotPasswordPage";
import ResetPassword from "./modules/auth/pages/ResetPasswordPage";
import CompleteProfile from "./modules/auth/pages/CompleteProfilePage";
import FriendPage from "./pages/FriendDashboard/FriendPage";
import ExpenseDetailPage from "./pages/ExpenseDetail/ExpenseDetailPage";
import GroupsPage from "./features/groups/pages/GroupsPage";
import GroupDetailsPage from "./features/groups/pages/GroupDetailsPage";
import ToastContainer from "./components/Toast";
import { ProtectedRoute } from "./modules/auth/routes/ProtectedRoute";
import { PublicRoute } from "./modules/auth/routes/PublicRoute";
import { AuthProvider } from "./modules/auth/context/AuthProvider";
import { useAuth } from "./modules/auth/hooks/useAuth";


function AppRoutes() {
  const { user, initialized } = useAuth();

  // Show a full-screen spinner while the initial auth check is resolving
  if (!initialized) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-surface-300">
      <ToastContainer />

      <Routes>
        {/* AUTH — redirect to dashboard if already logged in */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        {/* Public — accessible without a session */}
        <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* PROTECTED ROUTES */}
        <Route path="/complete-profile" element={<ProtectedRoute requireCompleteProfile={false}><CompleteProfile /></ProtectedRoute>} />
        
        {/* Protected Dashboard/Friends layout wrapper */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/friends" element={<FriendDashboard />} />
          <Route path="/friends/:friendId" element={<FriendPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
          <Route path="/expense/:expenseId" element={<ExpenseDetailPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

