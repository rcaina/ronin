"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Receipt,
  PiggyBank,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface TabItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

// Primary mobile navigation. Categories (and everything else) stays reachable
// through the MobileHeader menu.
const tabs: TabItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/budgets", icon: Target, label: "Budgets" },
  { href: "/transactions", icon: Receipt, label: "Activity" },
  { href: "/savings", icon: PiggyBank, label: "Savings" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/70 bg-white/90 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5"
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
                  isActive ? "bg-secondary/15" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? "text-secondary-600" : "text-gray-400"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </span>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-secondary-700" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
