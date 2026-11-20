"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Receipt,
  PiggyBank,
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
  feature?: "savings";
}

// Primary mobile navigation; the other pages live in MobileNavDrawer (the top bar's menu).
const tabs: TabItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/budgets", icon: Target, label: "Budgets" },
  { href: "/transactions", icon: Receipt, label: "Activity" },
  { href: "/savings", icon: PiggyBank, label: "Savings", feature: "savings" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;
  const visibleTabs = tabs.filter(
    (tab) => !tab.feature || isFeatureEnabled(settings, tab.feature),
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-surface-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className={`grid ${visibleTabs.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
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
      </div>
    </nav>
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
