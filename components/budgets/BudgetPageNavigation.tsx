"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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

export default function BudgetPageNavigation() {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

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

  // Keep the active tab in view when the floating row scrolls horizontally on
  // mobile (5 tabs overflow a 375px screen).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <>
      {/* Desktop: in-flow pill row under the page header */}
      <div className="hidden bg-surface lg:block">
        <nav className="scrollbar-hide mx-auto w-full overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="inline-flex rounded-full bg-surface-muted p-1">
            {budgetNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-white text-gray-900 shadow-soft"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile: floating pill bar docked just above the bottom tab bar so the
          budget's sections are always reachable while scrolling. */}
      <div
        className="fixed inset-x-0 z-50 flex justify-center px-3 lg:hidden"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        <nav className="scrollbar-hide flex max-w-full gap-1 overflow-x-auto rounded-full border border-gray-200/70 bg-white/95 p-1 shadow-lifted backdrop-blur-md">
          {budgetNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                ref={isActive ? activeRef : undefined}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-secondary/15 text-secondary-700"
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
