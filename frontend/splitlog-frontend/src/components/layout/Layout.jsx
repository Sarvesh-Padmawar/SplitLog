import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="w-full min-h-screen flex bg-surface-300 overflow-hidden text-gray-100">
      {/* Desktop Fixed Left Sidebar */}
      <Sidebar className="hidden lg:flex w-64 fixed inset-y-0 left-0 z-30" />

      {/* Main Structural Wrapper Container */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 min-h-screen">
        {/* Responsive Sticky Header Topbar */}
        <Topbar onMenuClick={() => setIsMobileOpen(true)} />

        {/* Dynamic Outlet Page content scroll window */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full">
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer Slide sidebar panel */}
      <MobileSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
    </div>
  );
}
