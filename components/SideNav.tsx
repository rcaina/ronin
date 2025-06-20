"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface SideNavProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function SideNav({ isCollapsed, setIsCollapsed }: SideNavProps) {
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/sign-in",
    });
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-black/90 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-14 flex h-6 w-6 items-center justify-center rounded-md bg-black/90 text-white"
      >
        {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>

      <div className="flex h-full flex-col p-4">
        {/**logo*/}
        <div
          className={`mb-8 flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"}`}
        >
          <div className={`${isCollapsed ? "h-10 w-10" : "h-12 w-12"}`}>
            {/* Fox SVG */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-full w-full text-secondary"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                fill="currentColor"
              />
              <path
                d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            {!isCollapsed && (
              <h2 className="text-xl font-bold text-secondary">RONIN</h2>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10 ${isCollapsed ? "justify-center" : ""}`}
          >
            <span>🏠</span>
            {!isCollapsed && <span>Home</span>}
          </Link>

          <Link
            href="/budgets"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10 ${isCollapsed ? "justify-center" : ""}`}
          >
            <span>💰</span>
            {!isCollapsed && <span>Budgets</span>}
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10 ${isCollapsed ? "justify-center" : ""}`}
          >
            <span>⚙️</span>
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </nav>

        {/* Profile section at the bottom */}
        <div className="mt-auto">
          <div className="relative">
            <button
              onClick={() => setShowProfilePopup(!showProfilePopup)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10"
            >
              <User className="h-5 w-5" />
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span className="truncate">
                    {session?.user?.name ?? "Profile"}
                  </span>
                </div>
              )}
            </button>

            {/* Profile popup */}
            {showProfilePopup && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur-sm">
                <div className="mb-2 border-b border-gray-200 pb-2">
                  <div className="text-sm font-medium text-gray-900">
                    {session?.user?.name ?? "User"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {session?.user?.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
