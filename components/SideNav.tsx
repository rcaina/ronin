"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
  LayoutDashboard,
  Target,
  Receipt,
  FolderOpen,
  PiggyBank,
  Settings,
  CreditCard,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useFeatureSettings } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { isFeatureEnabled } from "@/lib/utils/features";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";
import NotificationBell from "@/components/notifications/NotificationBell";

interface SideNavProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Module key gating this item; omitted for core items that are never toggleable. */
  feature?: "savings" | "cards";
}

const navItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/budgets", icon: Target, label: "Budgets" },
  { href: "/transactions", icon: Receipt, label: "Transactions" },
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/cards", icon: CreditCard, label: "Cards", feature: "cards" },
  { href: "/savings", icon: PiggyBank, label: "Savings", feature: "savings" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// Leading icon slot as wide as the collapsed rail's content column (w-16 minus
// p-3 each side), so icons never move and only the labels fade on collapse.
const NAV_LEAD = "grid w-10 shrink-0 place-items-center";

// Label beside an icon on the collapsed rail; the row needs `group relative`.
// aria-hidden because the faded row label already gives the accessible name.
function NavTooltip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lifted transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

export default function SideNav({ isCollapsed, setIsCollapsed }: SideNavProps) {
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;
  const visibleNavItems = navItems.filter(
    (item) => !item.feature || isFeatureEnabled(settings, item.feature),
  );

  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/sign-in",
    });
  };

  const labelFade = `min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-opacity duration-200 ease-out motion-reduce:transition-none ${
    isCollapsed ? "opacity-0" : "opacity-100"
  }`;

  return (
    <div
      className={`fixed left-0 top-0 z-40 hidden h-screen bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block [&_:focus-visible]:outline-accent-400 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Pinned to the rail's right edge so it rides the width transition. */}
      <button
        onClick={() => {
          setShowProfilePopup(false);
          setIsCollapsed(!isCollapsed);
        }}
        aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        aria-expanded={!isCollapsed}
        className="absolute right-0 top-[84px] z-50 flex h-6 w-6 translate-x-1/2 items-center justify-center rounded-full border border-primary-800 bg-accent text-primary shadow-card transition-colors hover:bg-accent-400"
        title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
      </button>

      <div className="flex h-full flex-col p-3">
        <div className="mb-8 mt-2 flex h-12 shrink-0 items-center overflow-hidden">
          <span className={NAV_LEAD}>
            <span className="block h-10 w-10 p-0.5">
              <Image
                src="/ronin_logo.jpg"
                alt="Ronin Logo"
                width={64}
                height={64}
                className="h-full w-full rounded-full ring-2 ring-accent-400/40"
                priority
              />
            </span>
          </span>
          <h2
            aria-hidden={isCollapsed}
            className={`ml-2 whitespace-nowrap text-lg font-bold tracking-[0.2em] text-accent-400 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
              isCollapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            RONIN
          </h2>
        </div>

        <nav className="flex flex-col gap-1">
          {visibleNavItems.map((item) => {
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
                className={`group relative flex items-center rounded-xl py-2.5 text-sm transition-colors duration-200 ease-out ${
                  isActive
                    ? "bg-accent-400/15 font-medium text-accent"
                    : "text-primary-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={NAV_LEAD}>
                  <Icon
                    className={`h-5 w-5 ${isActive ? "text-accent-400" : ""}`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </span>
                <span className={labelFade}>{item.label}</span>
                {isCollapsed && <NavTooltip>{item.label}</NavTooltip>}
              </Link>
            );
          })}
        </nav>

        {/* Profile section at the bottom */}
        <div className="mt-auto border-t border-white/10 pt-3">
          {isFeatureEnabled(settings, "notifications") && (
            <NotificationBell
              variant="dark"
              navRow={{
                leadClassName: NAV_LEAD,
                labelClassName: labelFade,
                tooltip: isCollapsed ? (
                  <NavTooltip>Notifications</NavTooltip>
                ) : undefined,
              }}
              className="mb-1"
            />
          )}
          <div className="relative">
            <button
              onClick={() => setShowProfilePopup(!showProfilePopup)}
              className="group relative flex w-full items-center rounded-xl py-2.5 text-sm text-primary-200 transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              <span className={NAV_LEAD}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400/20 text-accent-400">
                  <User className="h-4 w-4" />
                </span>
              </span>
              <span className={labelFade}>
                {session?.user?.name ?? "Profile"}
              </span>
              {isCollapsed && (
                <NavTooltip>{session?.user?.name ?? "Profile"}</NavTooltip>
              )}
            </button>

            {/* Profile popup */}
            {showProfilePopup && (
              <div
                className={`absolute bottom-full mb-2 animate-scale-in rounded-2xl border border-gray-200/70 bg-surface-card p-2 shadow-lifted ${
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
