"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  LayoutDashboard,
  Target,
  Receipt,
  FolderOpen,
  PiggyBank,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface SideNavProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/budgets", icon: Target, label: "Budgets" },
  { href: "/transactions", icon: Receipt, label: "Transactions" },
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/savings", icon: PiggyBank, label: "Savings" },
  { href: "/settings", icon: Settings, label: "Settings" },
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
        className={`fixed top-24 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-primary-800 bg-accent text-primary shadow-card transition-all duration-300 ease-in-out hover:bg-secondary ${
          isCollapsed ? "left-[52px]" : "left-[244px]"
        }`}
        title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {isCollapsed ? (
          <PanelLeftOpen size={14} />
        ) : (
          <PanelLeftClose size={14} />
        )}
      </button>

      <div className="flex h-full flex-col p-3">
        {/**logo*/}
        <div
          className={`mb-8 mt-2 flex items-center overflow-hidden ${isCollapsed ? "justify-center" : "gap-3 px-2"}`}
        >
          <div
            className={`flex-shrink-0 ${isCollapsed ? "h-10 w-10" : "h-12 w-12"}`}
          >
            <Image
              src="/ronin_logo.jpg"
              alt="Ronin Logo"
              width={isCollapsed ? 48 : 64}
              height={isCollapsed ? 48 : 64}
              className="h-full w-full rounded-full ring-2 ring-secondary/40"
              priority
            />
          </div>
          <div
            className={`transition-all duration-300 ease-in-out ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
          >
            <h2 className="whitespace-nowrap text-lg font-bold tracking-[0.2em] text-secondary">
              RONIN
            </h2>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-xl py-2.5 text-sm transition-all duration-200 ease-out ${
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3"
                } ${
                  isActive
                    ? "bg-secondary/15 font-medium text-accent"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-secondary" : ""}`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className={`whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Profile section at the bottom */}
        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="relative">
            <button
              onClick={() => setShowProfilePopup(!showProfilePopup)}
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-gray-300 transition-colors duration-200 hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center" : "gap-3"}`}
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                <User className="h-4 w-4" />
              </div>
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
                className={`absolute bottom-full mb-2 animate-scale-in rounded-2xl border border-gray-200/70 bg-white p-2 shadow-lifted ${
                  isCollapsed ? "left-0 w-64" : "left-0 w-full"
                }`}
              >
                <div className="mb-2 border-b border-gray-100 px-2 pb-2 pt-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {session?.user?.name ?? "User"}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {session?.user?.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
