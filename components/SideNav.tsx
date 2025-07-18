"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface SideNavProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: "📊", label: "Overview" },
  { href: "/budgets", icon: "🎯", label: "Budget" },
  { href: "/transactions", icon: "🧾", label: "Transactions" },
  { href: "/categories", icon: "📋", label: "Categories" },
  { href: "/cards", icon: "💳", label: "Cards" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export default function SideNav({ isCollapsed, setIsCollapsed }: SideNavProps) {
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/sign-in",
    });
  };

  return (
    <div
      className={`fixed left-0 top-0 z-40 hidden h-screen bg-black/90 transition-all duration-300 ease-in-out lg:block ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`fixed top-24 z-50 flex h-6 w-6 items-center justify-center rounded-md bg-black/90 text-white transition-all duration-300 ease-in-out hover:bg-black/80 ${
          isCollapsed ? "left-12" : "left-60"
        }`}
      >
        {isCollapsed ? (
          <PanelLeftOpen size={14} />
        ) : (
          <PanelLeftClose size={14} />
        )}
      </button>

      <div className="flex h-full flex-col p-4">
        {/**logo*/}
        <div
          className={`mb-8 flex items-center overflow-hidden ${isCollapsed ? "justify-center" : "gap-3 px-3"}`}
        >
          <div
            className={`flex-shrink-0 ${isCollapsed ? "h-10 w-10" : "h-12 w-12"}`}
          >
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
          <div
            className={`transition-all duration-300 ease-in-out ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
          >
            <h2 className="whitespace-nowrap text-xl font-bold text-secondary">
              RONIN
            </h2>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center py-2 text-white transition-colors hover:bg-white/10 ${isCollapsed ? "justify-center" : "gap-3"} ${
                  isActive ? "mx-[-1rem] bg-[#F1C232]/70 px-7" : "px-3"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span
                  className={`transition-all duration-300 ease-in-out ${isCollapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Profile section at the bottom */}
        <div className="mt-auto">
          <div className="relative">
            <button
              onClick={() => setShowProfilePopup(!showProfilePopup)}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-white transition-colors hover:bg-white/10 ${isCollapsed ? "justify-center" : "gap-3"}`}
            >
              <User className="h-5 w-5 flex-shrink-0" />
              <div
                className={`transition-all duration-300 ease-in-out ${isCollapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100"}`}
              >
                <div className="flex flex-1 items-center justify-between">
                  <span className="truncate whitespace-nowrap">
                    {session?.user?.name ?? "Profile"}
                  </span>
                </div>
              </div>
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
