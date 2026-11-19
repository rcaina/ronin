"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Target,
  Receipt,
  PiggyBank,
  MoreHorizontal,
  FolderOpen,
  Settings,
  CreditCard,
  BarChart3,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useFeatureSettings } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { isFeatureEnabled } from "@/lib/utils/features";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";

interface TabItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Module key gating this item; omitted for core items that are never toggleable. */
  feature?: "savings" | "cards";
}

// Primary mobile navigation. The "More" tab opens a popup with the remaining
// destinations and account actions.
const tabs: TabItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/budgets", icon: Target, label: "Budgets" },
  { href: "/transactions", icon: Receipt, label: "Activity" },
  { href: "/savings", icon: PiggyBank, label: "Savings", feature: "savings" },
];

// Destinations surfaced inside the "More" popup.
const moreLinks: TabItem[] = [
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/cards", icon: CreditCard, label: "Cards", feature: "cards" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;
  const visibleTabs = tabs.filter(
    (tab) => !tab.feature || isFeatureEnabled(settings, tab.feature),
  );
  const visibleMoreLinks = moreLinks.filter(
    (link) => !link.feature || isFeatureEnabled(settings, link.feature),
  );

  const isMoreActive =
    isMoreOpen ||
    visibleMoreLinks.some(
      (link) => pathname === link.href || pathname.startsWith(link.href + "/"),
    );

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/sign-in" });
  };

  return (
    <>
      {/* More popup */}
      {isMoreOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] animate-fade-in bg-primary-950/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsMoreOpen(false)}
          />
          <div
            className="fixed right-3 z-[60] w-56 animate-fade-in overflow-hidden rounded-2xl border border-gray-400/60 bg-surface-card p-1.5 shadow-lifted lg:hidden"
            style={{
              bottom: "calc(56px + env(safe-area-inset-bottom) + 0.5rem)",
            }}
          >
            {visibleMoreLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isActive ? "text-gray-900" : "text-gray-500"}`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
            <div className="my-1 border-t border-gray-200/70" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-600 transition-colors duration-200 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-surface-card lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className={`grid ${visibleTabs.length + 1 === 5 ? "grid-cols-5" : "grid-cols-4"}`}
        >
          {visibleTabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname === tab.href || pathname.startsWith(tab.href + "/");
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5"
              >
                <TabIndicator active={isActive} />
                <TabGlyph icon={Icon} label={tab.label} active={isActive} />
              </Link>
            );
          })}

          {/* More tab — opens the popup above */}
          <button
            onClick={() => setIsMoreOpen((open) => !open)}
            className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5"
            aria-label="More options"
            aria-expanded={isMoreOpen}
          >
            <TabIndicator active={isMoreActive} />
            <TabGlyph
              icon={MoreHorizontal}
              label="More"
              active={isMoreActive}
            />
          </button>
        </div>
      </nav>
    </>
  );
}

function TabIndicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-gray-900 transition-opacity duration-150 ease-brand ${
        active ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

function TabGlyph({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      <Icon
        className={`h-5 w-5 transition-colors duration-150 ease-brand ${
          active ? "text-gray-900" : "text-gray-500"
        }`}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span
        className={`text-[11px] transition-colors duration-150 ease-brand ${
          active ? "font-semibold text-gray-900" : "font-medium text-gray-600"
        }`}
      >
        {label}
      </span>
    </>
  );
}
