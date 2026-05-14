import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { completeProfileSchema } from "../utils/auth.validation";
import { AUTH_ROUTES } from "../utils/auth.constants";

export default function CompleteProfilePage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { user, completeProfile, actionLoading, initialized } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // If somehow they get here but are already complete, bounce them
    if (initialized && user && user.isProfileComplete) {
      navigate(AUTH_ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, initialized, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validation = completeProfileSchema.safeParse({ username });
    if (!validation.success) {
      return setError(validation.error.errors[0].message);
    }

    const result = await completeProfile(username);
    if (!result.success) {
      setError(result.error);
    } else {
      navigate(AUTH_ROUTES.DASHBOARD);
    }
  };

  if (!initialized || (user && user.isProfileComplete)) {
    return null; // Don't flash the form while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-700 mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
          <p className="text-gray-400">
            You signed in with Google! To finish setting up your account, please choose a unique username.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm animate-fadeIn">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="e.g. john_doe"
            />
            <p className="mt-2 text-xs text-gray-500">Minimum 6 characters. Must be unique.</p>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? "Saving..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
