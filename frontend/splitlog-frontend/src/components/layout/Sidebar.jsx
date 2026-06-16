import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Wallet, Users, LogOut, LayoutDashboard, Folder } from "lucide-react";
import { useAuth } from "../../modules/auth/hooks/useAuth";

export default function Sidebar({ className }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className={`flex flex-col h-full bg-surface-100 border-r border-white/[0.06] ${className}`}>
      {/* Brand Header */}
      <div 
        onClick={() => navigate("/")}
        className="flex items-center gap-3 px-6 py-6 cursor-pointer group"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow group-hover:scale-105 transition-all duration-300">
          <Wallet size={20} strokeWidth={2.2} />
        </div>
        <span className="text-xl font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
          SplitLog
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1.5">
        <SidebarNavItem to="/" icon={<LayoutDashboard />} label="Dashboard" end />
        <SidebarNavItem to="/friends" icon={<Users />} label="Friends" />
        <SidebarNavItem to="/groups" icon={<Folder />} label="Groups" />
      </nav>

      {/* User Footer Account details */}
      <div className="p-4 border-t border-white/[0.06] bg-surface-200/50">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold border border-emerald-500/20">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-100 truncate">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.05] transition-all duration-200"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `
        flex items-center gap-3
        px-4 py-3 rounded-xl
        text-sm font-medium
        transition-all duration-200
        group
        ${
          isActive
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
            : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
        }
      `
      }
    >
      {({ isActive }) => (
        <>
          <span className={`transition-colors duration-200 ${isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"}`}>
            {React.cloneElement(icon, { size: 18, strokeWidth: isActive ? 2.2 : 2 })}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
