"use client";

import Link from "next/link";
import { tabClassName } from "@/components/Tabs";
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
      {/* Underline tab row under the page header; sticks under it on mobile */}
      <div className="sticky top-0 z-20 border-b border-gray-200/70 bg-surface/90 px-4 pt-3 backdrop-blur-md sm:px-6 lg:static lg:z-auto lg:border-b-0 lg:bg-surface lg:px-8 lg:backdrop-blur-none">
        <nav className="flex flex-wrap">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={tabClassName(isActive)}
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
