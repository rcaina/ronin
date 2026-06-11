"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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

  return (
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
  );
}
