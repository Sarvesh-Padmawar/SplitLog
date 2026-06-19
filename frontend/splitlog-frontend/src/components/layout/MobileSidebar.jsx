import React, { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Wallet, Users, LogOut, LayoutDashboard, X, Folder, Settings } from "lucide-react";
import { useAuth } from "../../modules/auth/hooks/useAuth";

export default function MobileSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close mobile drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]); // Triggered every time the path changes

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop Curtain Overlay */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} 
      />

      {/* Transform Slide Drawer panel */}
      <aside 
        className={`
          absolute top-0 bottom-0 left-0 w-[280px] max-w-[85vw]
          bg-surface-100 border-r border-white/[0.06]
          flex flex-col h-full z-10
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header with Brand + Close Trigger */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow">
              <Wallet size={16} strokeWidth={2.2} />
            </div>
            <span className="text-lg font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              SplitLog
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <MobileSidebarNavItem to="/" icon={<LayoutDashboard />} label="Dashboard" end />
          <MobileSidebarNavItem to="/friends" icon={<Users />} label="Friends" />
          <MobileSidebarNavItem to="/groups" icon={<Folder />} label="Groups" />
          <MobileSidebarNavItem to="/settings" icon={<Settings />} label="Settings" />
        </nav>

        {/* User profile footer */}
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
    </div>
  );
}

function MobileSidebarNavItem({ to, icon, label, end }) {
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
