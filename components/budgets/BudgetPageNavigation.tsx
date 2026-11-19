"use client";

import Link from "next/link";
import { centerSelected, tabClassName } from "@/components/Tabs";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Target,
  List,
  CreditCard,
  DollarSign,
  ReceiptText,
} from "lucide-react";

interface BudgetNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function BudgetPageNavigation({
  trailing,
}: {
  /** The month switcher: at the right end of the desktop row, above the tabs on mobile. */
  trailing?: React.ReactNode;
}) {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  const mobileTabsRef = useRef<HTMLElement>(null);

  const budgetNavItems: BudgetNavItem[] = [
    {
      href: `/budgets/${id}`,
      icon: <Target className="h-4 w-4" />,
      label: "Overview",
    },
    {
      href: `/budgets/${id}/income`,
      icon: <DollarSign className="h-4 w-4" />,
      label: "Income",
    },
    {
      href: `/budgets/${id}/categories`,
      icon: <List className="h-4 w-4" />,
      label: "Categories",
    },
    {
      href: `/budgets/${id}/transactions`,
      icon: <ReceiptText className="h-4 w-4" />,
      label: "Transactions",
    },
    {
      href: `/budgets/${id}/cards`,
      icon: <CreditCard className="h-4 w-4" />,
      label: "Cards",
    },
  ];

  // Keep the active tab in view when the mobile row scrolls horizontally.
  useEffect(() => {
    if (mobileTabsRef.current) centerSelected(mobileTabsRef.current);
  }, [pathname]);

  return (
    <>
      {/* Desktop: in-flow underline tab row under the page header */}
      <div className="mx-auto hidden w-full items-center justify-between gap-4 bg-surface px-4 py-2 sm:px-6 lg:flex lg:px-8">
        <nav className="scrollbar-hide min-w-0 overflow-x-auto">
          <div className="flex">
            {budgetNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={`${item.href}${query}`}
                  aria-current={isActive ? "page" : undefined}
                  className={tabClassName(isActive)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        {trailing}
      </div>

      {/* Mobile: the month switcher, then the section tabs in the page flow. Five
          sections overflow 375px, so this row scrolls with the active tab kept in view. */}
      <div className="lg:hidden">
        {trailing && <div className="px-4 py-2 sm:px-6">{trailing}</div>}
        <nav
          ref={mobileTabsRef}
          aria-label="Budget sections"
          className="scrollbar-hide flex overflow-x-auto px-4 sm:px-6"
        >
          {budgetNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                data-selected={isActive || undefined}
                href={`${item.href}${query}`}
                aria-current={isActive ? "page" : undefined}
                className={tabClassName(isActive)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
