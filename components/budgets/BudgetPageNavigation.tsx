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
    <div className="hidden border-b border-gray-200 bg-primary lg:block">
      <nav className="mx-auto flex w-full overflow-x-auto px-4 sm:px-6 lg:px-8">
        {budgetNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-colors hover:text-primary sm:px-4 ${
                isActive
                  ? "text-accent hover:text-accent"
                  : "text-white hover:text-secondary"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
