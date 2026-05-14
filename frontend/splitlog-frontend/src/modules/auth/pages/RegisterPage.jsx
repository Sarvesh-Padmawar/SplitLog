import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { RegisterForm } from "../components/RegisterForm";
import { useAuth } from "../hooks/useAuth";
import { authApi } from "../api/auth.api";

export default function RegisterPage() {
  const { register, actionLoading } = useAuth();
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const handleRegisterSubmit = async (userData) => {
    setError("");
    const result = await register(userData);
    if (!result.success) {
      setError(result.error);
    } else {
      setRegistered(true);
    }
  };

  const handleGoogleError = (errorMsg) => {
    setError(errorMsg);
  };

  const handleResend = async (email) => {
    setResendLoading(true);
    setResendMsg("");
    try {
      await authApi.resendVerification(email);
      setResendMsg("Verification email resent! Check your inbox.");
    } catch {
      setResendMsg("Could not resend. Please try again in a moment.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout>
      <RegisterForm 
        onSubmit={handleRegisterSubmit} 
        loading={actionLoading} 
        error={error} 
        onGoogleError={handleGoogleError} 
        registered={registered}
        resendLoading={resendLoading}
        resendMsg={resendMsg}
        onResend={handleResend}
      />
    </AuthLayout>
  );
}
