"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function SideNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-black/90 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 flex h-6 w-6 items-center justify-center rounded-md bg-black/90 text-white"
      >
        {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>

      <div className="flex h-full flex-col p-4">
        <div className="mb-8">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-white">Navigation</h2>
          )}
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10"
          >
            <span>🏠</span>
            {!isCollapsed && <span>Home</span>}
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10"
          >
            <span>📊</span>
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10"
          >
            <span>⚙️</span>
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </nav>
      </div>
    </div>
  );
}
