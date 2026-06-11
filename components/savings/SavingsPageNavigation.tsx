"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Target, DollarSign } from "lucide-react";

interface SavingsNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function SavingsPageNavigation() {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();

  const savingsNavItems: SavingsNavItem[] = [
    {
      href: `/savings/${id}`,
      icon: <Target className="h-4 w-4" />,
      label: "Overview",
    },
    {
      href: `/savings/${id}/allocations`,
      icon: <DollarSign className="h-4 w-4" />,
      label: "Allocations",
    },
  ];

  return (
    <>
      {/* Desktop: in-flow pill row under the page header */}
      <div className="hidden bg-surface px-4 pt-3 sm:px-6 lg:block lg:px-8">
        <nav className="inline-flex rounded-full bg-surface-muted p-1">
          {savingsNavItems.map((item) => {
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
        </nav>
      </div>

      {/* Mobile: floating pill bar docked just above the bottom tab bar so the
          account's sections are always reachable while scrolling. */}
      <div
        className="fixed inset-x-0 z-50 flex justify-center px-3 lg:hidden"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        <nav className="scrollbar-hide flex max-w-full gap-1 overflow-x-auto rounded-full border border-gray-200/70 bg-white/95 p-1 shadow-lifted backdrop-blur-md">
          {savingsNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 ease-out ${
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
