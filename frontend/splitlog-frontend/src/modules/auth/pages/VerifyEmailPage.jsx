import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader, RefreshCw } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../api/auth.api";
import { AUTH_ROUTES } from "../utils/auth.constants";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the URL.");
      return;
    }

    const verify = async () => {
      try {
        const data = await authApi.verifyEmail(token);
        if (isMounted) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        }
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          setMessage(err.response?.data?.message || "Invalid or expired verification link.");
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendLoading(true);
    setResendMsg("");
    try {
      await authApi.resendVerification(resendEmail);
      setResendMsg("New verification email sent! Check your inbox.");
    } catch {
      setResendMsg("Could not resend. Please try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <Loader className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-gray-400 text-sm">Verifying your email…</p>
        </div>
      )}

      {/* ── Success ─────────────────────────────────────────────────────── */}
      {status === "success" && (
        <div className="text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">
            Email Verified!
          </h2>
          <p className="text-sm text-gray-400 mb-8">{message}</p>
          <button
            onClick={() => navigate(AUTH_ROUTES.LOGIN)}
            className="w-full h-12 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                       hover:from-emerald-400 hover:to-teal-400
                       transition-all duration-300"
          >
            Go to Login
          </button>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {status === "error" && (
        <div className="text-center">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">
            Verification Failed
          </h2>
          <p className="text-sm text-gray-400 mb-6">{message}</p>

          <p className="text-sm text-gray-500 mb-3">
            Need a new link? Enter your email below:
          </p>
          <form onSubmit={handleResend} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1]
                         text-sm text-gray-100 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
            <button
              type="submit"
              disabled={resendLoading}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                         border border-emerald-500/40 text-emerald-400
                         hover:bg-emerald-500/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${resendLoading ? "animate-spin" : ""}`} />
              {resendLoading ? "Sending…" : "Resend Verification Email"}
            </button>
          </form>

          {resendMsg && (
            <p className="mt-4 text-sm text-emerald-400">{resendMsg}</p>
          )}

          <button
            onClick={() => navigate(AUTH_ROUTES.LOGIN)}
            className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition"
          >
            Back to Login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
