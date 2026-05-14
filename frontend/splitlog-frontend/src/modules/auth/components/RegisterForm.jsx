import { useState } from "react";
import { Link } from "react-router-dom";
import { User, AtSign, Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle, RefreshCw } from "lucide-react";
import { GoogleButton } from "./GoogleButton";
import { registerSchema } from "../utils/auth.validation";
import { AUTH_ROUTES } from "../utils/auth.constants";

export function RegisterForm({ onSubmit, loading, error, onGoogleError, registered, resendLoading, resendMsg, onResend }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    onSubmit(form);
  };

  const displayError = validationError || error;
  const inputClass = "w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition";

  if (registered) {
    return (
      <div className="text-center">
        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Check your email</h2>
        <p className="text-sm text-gray-400 mb-6">
          We've sent a verification link to <span className="text-emerald-400 font-medium">{form.email}</span>.
        </p>

        {resendMsg && (
          <p className="mb-4 text-sm text-emerald-400">{resendMsg}</p>
        )}

        <button
          onClick={() => onResend(form.email)}
          disabled={resendLoading}
          className="flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-200 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${resendLoading ? "animate-spin" : ""}`} />
          {resendLoading ? "Sending…" : "Resend verification email"}
        </button>

        <p className="text-sm text-gray-500 mt-6">
          Already verified?{" "}
          <Link
            to={AUTH_ROUTES.LOGIN}
            className="text-emerald-400 font-medium hover:text-emerald-300 transition"
          >
            Go to Login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-100 mb-6">Create Account</h2>

      {displayError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Username */}
        <div className="relative">
          <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className={`${inputClass} !pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
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
              <UserPlus className="w-4 h-4" />
              Sign Up
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

        <GoogleButton actionText="signup_with" onError={onGoogleError} />
      </form>

      <p className="text-sm text-gray-500 mt-6 text-center">
        Already have an account?{" "}
        <Link
          to={AUTH_ROUTES.LOGIN}
          className="text-emerald-400 font-medium hover:text-emerald-300 transition"
        >
          Login
        </Link>
      </p>
    </>
  );
}
