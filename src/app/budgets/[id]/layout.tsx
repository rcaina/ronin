"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Target,
  List,
  CreditCard,
  TrendingUp,
  DollarSign,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ReceiptIcon,
  ReceiptText,
} from "lucide-react";
import { useMainNav, useBudgetNav } from "@/components/ConditionalLayout";

interface BudgetNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMainNavCollapsed } = useMainNav();
  const { isBudgetNavCollapsed, setIsBudgetNavCollapsed } = useBudgetNav();
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();

  const budgetNavItems: BudgetNavItem[] = [
    {
      href: `/budgets/${id}`,
      icon: <Target className="h-5 w-5" />,
      label: "Overview",
    },
    {
      href: `/budgets/${id}/income`,
      icon: <DollarSign className="h-5 w-5" />,
      label: "Income",
    },
    {
      href: `/budgets/${id}/categories`,
      icon: <List className="h-5 w-5" />,
      label: "Categories",
    },
    {
      href: `/budgets/${id}/transactions`,
      icon: <ReceiptText className="h-5 w-5" />,
      label: "Transactions",
    },
    {
      href: `/budgets/${id}/cards`,
      icon: <CreditCard className="h-5 w-5" />,
      label: "Cards",
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Budget Side Navigation */}
      <div
        className={`fixed top-0 z-[38] hidden h-screen bg-secondary transition-all duration-300 ease-in-out lg:block ${
          isBudgetNavCollapsed ? "w-16" : "w-56"
        } ${isMainNavCollapsed ? "left-16" : "left-64"}`}
      >
        <button
          onClick={() => setIsBudgetNavCollapsed(!isBudgetNavCollapsed)}
          className={`fixed top-24 z-50 flex h-6 w-6 items-center justify-center rounded-md border border-primary bg-primary text-white transition-all duration-300 ease-in-out hover:bg-secondary hover:text-primary ${
            isBudgetNavCollapsed
              ? isMainNavCollapsed
                ? "left-28"
                : "left-[19rem]"
              : isMainNavCollapsed
                ? "left-[17rem]"
                : "left-[29rem]"
          }`}
        >
          {isBudgetNavCollapsed ? (
            <PanelLeftOpen size={14} />
          ) : (
            <PanelLeftClose size={14} />
          )}
        </button>

        <div className="mt-4 flex h-full flex-col p-4">
          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            {budgetNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center py-2 text-primary transition-colors ${isBudgetNavCollapsed ? "justify-center" : "gap-3"} ${
                    isActive
                      ? "mx-[-1rem] bg-primary px-7 !text-white"
                      : "mx-[-1rem] px-7 hover:bg-black/80 hover:text-white"
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span
                    className={`transition-all duration-300 ease-in-out ${isBudgetNavCollapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isBudgetNavCollapsed
            ? isMainNavCollapsed
              ? "lg:ml-8"
              : "lg:ml-4"
            : isMainNavCollapsed
              ? "lg:ml-48"
              : "lg:ml-44"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
