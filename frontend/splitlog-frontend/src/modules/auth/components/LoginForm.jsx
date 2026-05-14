import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { GoogleButton } from "./GoogleButton";
import { loginSchema } from "../utils/auth.validation";
import { AUTH_ROUTES } from "../utils/auth.constants";

export function LoginForm({ onSubmit, loading, error, onGoogleError }) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate using Zod
    const result = loginSchema.safeParse({ emailOrUsername, password });
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    onSubmit({ emailOrUsername, password });
  };

  const displayError = validationError || error;

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-100 mb-6">Welcome back</h2>

      {displayError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email / Username */}
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Email or Username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 pl-11 pr-11 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Forgot password */}
        <div className="text-right -mt-1">
          <Link
            to={AUTH_ROUTES.FORGOT_PASSWORD}
            className="text-xs text-gray-500 hover:text-emerald-400 transition"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                     bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                     hover:from-emerald-400 hover:to-teal-400
                     shadow-glow hover:shadow-glow-lg
                     transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Login
            </>
          )}
        </button>

        {/* Google Auth Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.1]"></div>
          </div>
          <div className="relative bg-gray-900 px-4 text-xs text-gray-500 uppercase">
            Or continue with
          </div>
        </div>

        <GoogleButton actionText="continue_with" onError={onGoogleError} />
      </form>

      <p className="text-sm text-gray-500 mt-6 text-center">
        Don't have an account?{" "}
        <Link
          to={AUTH_ROUTES.REGISTER}
          className="text-emerald-400 font-medium hover:text-emerald-300 transition"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
