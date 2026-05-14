import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Wallet, Users, LogOut } from "lucide-react";
import { useAuth } from "../modules/auth/hooks/useAuth";
import NotificationPanel from "./NotificationPanel";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="flex justify-center px-4 animate-fadeIn relative z-50">
      <div
        className="
          w-full max-w-4xl
          min-h-[64px]
          flex items-center justify-between
          px-5 py-2.5 mt-5 mb-4
          rounded-2xl
          glass
        "
      >
        {/* ── Brand ── */}
        <div
          onClick={() => navigate("/")}
          className="
            group flex items-center gap-2.5 cursor-pointer
            px-3 py-2 rounded-xl
            hover:bg-white/[0.05]
            transition-all duration-300
          "
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow">
            <Wallet size={18} strokeWidth={2.2} />
          </div>
          <span className="text-lg font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            SplitLog
          </span>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex items-center gap-1">
          <NavItem to="/" icon={<Wallet />} label="Dashboard" end />
          <NavItem to="/friends" icon={<Users />} label="Friends" />

          {/* ── Notification Bell + User ── */}
          <div className="flex items-center gap-2 ml-3 pl-3 border-l border-white/[0.08]">
            <NotificationPanel />

            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.05] transition"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ──────────── NAV ITEM ──────────── */

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `
        flex items-center gap-2
        px-3.5 py-2 rounded-xl
        text-sm font-medium
        transition-all duration-200
        ${
          isActive
            ? "bg-emerald-500/15 text-emerald-400"
            : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
        }
      `
      }
    >
      {React.cloneElement(icon, { size: 17, strokeWidth: 2 })}
      <span>{label}</span>
    </NavLink>
  );
}

export default Navbar;
