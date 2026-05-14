import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, Send } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../api/auth.api";
import { AUTH_ROUTES } from "../utils/auth.constants";
import { forgotPasswordSchema } from "../utils/auth.validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition";

  return (
    <AuthLayout>
      {submitted ? (
        <div className="text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Check your email</h2>
          <p className="text-sm text-gray-400 mb-6">
            If an account with <span className="text-emerald-400 font-medium">{email}</span> exists,
            we've sent a password reset link. It expires in 15 minutes.
          </p>
          <p className="text-sm text-gray-500">
            Didn't get it?{" "}
            <button
              onClick={() => setSubmitted(false)}
              className="text-emerald-400 font-medium hover:text-emerald-300 transition"
            >
              Try again
            </button>
          </p>
          <Link
            to={AUTH_ROUTES.LOGIN}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Forgot your password?</h2>
          <p className="text-sm text-gray-400 mb-6">Enter your email and we'll send you a reset link.</p>

          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

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
                  <Send className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <Link
            to={AUTH_ROUTES.LOGIN}
            className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
