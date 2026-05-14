export default function AuthLayout({ children }) {
  return (
    <div className="auth-gradient-bg flex justify-center items-center min-h-screen px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      {/* Card */}
      <div className="w-full max-w-md glass-strong rounded-2xl sm:rounded-3xl p-6 sm:p-8 animate-fadeIn relative z-10 mx-auto">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            SplitLog
          </h1>
          <p className="text-sm text-gray-500 mt-1">Split smart. Settle easy.</p>
        </div>

        {children}
      </div>
    </div>
  );
}
