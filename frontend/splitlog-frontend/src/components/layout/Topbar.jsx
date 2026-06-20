import React from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Menu, LogOut } from "lucide-react";
import { useAuth } from "../../modules/auth/hooks/useAuth";
import NotificationPanel from "../NotificationPanel";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="w-full sticky top-0 z-20 bg-surface-300/80 backdrop-blur-md border-b border-white/[0.04] px-6 lg:px-16 py-3 flex items-center justify-between">
      {/* Left side: Hamburger (Mobile Only) + Page Context / Brand Logo (Mobile Only) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-all duration-200 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>

        {/* Brand Logo (Visible only on Mobile header) */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 cursor-pointer lg:hidden"
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow">
            <Wallet size={15} strokeWidth={2.2} />
          </div>
          <span className="text-md font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            SplitLog
          </span>
        </div>
      </div>

      {/* Right side: Notifications Panel + Profile Circle + Logout (Mobile only fallback) */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationPanel />

        {/* User profile bubble */}
        <div 
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all duration-200"
        >
          {user?.avatar?.url ? (
            <img
              src={user.avatar.url}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/20 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-semibold border border-emerald-500/20 shadow-sm">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <span className="hidden sm:inline text-xs font-medium text-gray-300">
            {user?.name || "User"}
          </span>
        </div>

        {/* Quick logout (only displayed on screens where the sidebar is hidden for extra safety, but it's fine to show anywhere) */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.05] transition-all duration-200 lg:hidden"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
