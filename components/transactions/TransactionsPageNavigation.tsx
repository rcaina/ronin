"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Receipt, Repeat } from "lucide-react";
import { useFeatureSettings } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { isFeatureEnabled } from "@/lib/utils/features";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";

interface TransactionsNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

/**
 * Sub-nav shown on `/transactions` and `/transactions/recurring`, mirroring
 * the pill-row pattern used for savings/budget sub-pages
 * (`SavingsPageNavigation`/`BudgetPageNavigation`). The Recurring tab is
 * hidden entirely when the household has turned the module off (see
 * `FeatureDisabledState`, which the recurring page itself falls back to if
 * someone still lands there via a direct link).
 */
export default function TransactionsPageNavigation() {
  const pathname = usePathname();
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;
  const recurringEnabled = isFeatureEnabled(settings, "recurringTransactions");

  const navItems: TransactionsNavItem[] = [
    {
      href: "/transactions",
      icon: <Receipt className="h-4 w-4" />,
      label: "Transactions",
    },
    ...(recurringEnabled
      ? [
          {
            href: "/transactions/recurring",
            icon: <Repeat className="h-4 w-4" />,
            label: "Recurring",
          },
        ]
      : []),
  ];

  if (navItems.length < 2) return null;

  return (
    <>
      {/* Desktop: in-flow pill row under the page header */}
      <div className="hidden bg-surface px-4 pt-3 sm:px-6 lg:block lg:px-8">
        <nav className="inline-flex rounded-full bg-surface-muted p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-surface-card text-gray-900 shadow-soft"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile: floating pill bar docked just above the bottom tab bar */}
      <div
        className="fixed inset-x-0 z-50 flex justify-center px-3 lg:hidden"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        <nav className="scrollbar-hide flex max-w-full gap-1 overflow-x-auto rounded-full border border-gray-400/60 bg-surface-muted/95 p-1 shadow-lifted backdrop-blur-md">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-secondary/15 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
