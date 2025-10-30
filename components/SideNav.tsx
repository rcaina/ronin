"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  { href: "/budgets", icon: "🎯", label: "Budgets" },
  { href: "/transactions", icon: "🧾", label: "Transactions" },
  { href: "/savings", icon: "🏦", label: "Savings" },
  { href: "/categories", icon: "📂", label: "Categories" },
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
      className={`fixed left-0 top-0 z-40 hidden h-screen bg-primary transition-all duration-300 ease-in-out lg:block ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`fixed top-24 z-50 flex h-6 w-6 items-center justify-center rounded-md border border-primary bg-accent text-primary transition-all duration-300 ease-in-out hover:bg-black/80 hover:text-white ${
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
            className={`flex-shrink-0 ${isCollapsed ? "h-10 w-10" : "h-16 w-16"}`}
          >
            <Image
              src="/ronin_logo.jpg"
              alt="Ronin Logo"
              width={isCollapsed ? 48 : 64}
              height={isCollapsed ? 48 : 64}
              className="h-full w-full rounded-full"
              priority
            />
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
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center py-2 text-white transition-colors ${isCollapsed ? "justify-center" : "gap-3"} ${
                  isActive
                    ? "mx-[-1rem] bg-secondary px-7"
                    : "mx-[-1rem] px-7 hover:bg-white/10"
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
              <div
                className={`absolute bottom-full mb-2 rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur-sm ${
                  isCollapsed
                    ? "left-0 w-64 border border-gray-300" // Fixed width when collapsed, positioned to the left
                    : "left-0 w-full" // Full width when expanded
                }`}
              >
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
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:text-black/60"
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
