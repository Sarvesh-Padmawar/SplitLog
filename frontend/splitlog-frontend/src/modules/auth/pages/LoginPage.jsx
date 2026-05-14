import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login, actionLoading } = useAuth();
  const [error, setError] = useState("");

  const handleLoginSubmit = async (credentials) => {
    setError("");
    const result = await login(credentials);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleGoogleError = (errorMsg) => {
    setError(errorMsg);
  };

  return (
    <AuthLayout>
      <LoginForm 
        onSubmit={handleLoginSubmit} 
        loading={actionLoading} 
        error={error} 
        onGoogleError={handleGoogleError} 
      />
    </AuthLayout>
  );
}
