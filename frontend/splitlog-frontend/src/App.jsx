import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard/Dashboard";
import FriendDashboard from "./pages/FriendDashboard/Dashboard";
import Navbar from "./components/Navbar";
import Login from "./modules/auth/pages/LoginPage";
import Signup from "./modules/auth/pages/RegisterPage";
import VerifyEmail from "./modules/auth/pages/VerifyEmailPage";
import ForgotPassword from "./modules/auth/pages/ForgotPasswordPage";
import ResetPassword from "./modules/auth/pages/ResetPasswordPage";
import CompleteProfile from "./modules/auth/pages/CompleteProfilePage";
import FriendPage from "./pages/FriendDashboard/FriendPage";
import ExpenseDetailPage from "./pages/ExpenseDetail/ExpenseDetailPage";
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
      {user && <Navbar />}

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
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendDashboard /></ProtectedRoute>} />
        <Route path="/friends/:friendId" element={<ProtectedRoute><FriendPage /></ProtectedRoute>} />
        <Route path="/expense/:expenseId" element={<ProtectedRoute><ExpenseDetailPage /></ProtectedRoute>} />
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

