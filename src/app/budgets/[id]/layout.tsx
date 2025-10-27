"use client";

import BudgetPageNavigation from "@/components/budgets/BudgetPageNavigation";
import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useMemo } from "react";
import { Plus, DollarSign, CreditCard } from "lucide-react";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string;

  const { data: budget } = useBudget(id);

  // Configure page header based on current pathname
  const pageHeaderConfig = useMemo(() => {
    if (pathname === `/budgets/${id}`) {
      // Main budget overview page
      return {
        title: budget?.name ?? "Budget",
        description: budget
          ? `${budget.period.replace("_", " ")} Budget • Created ${new Date(budget.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : "Loading...",
        showBackButton: true,
        actions: [
          {
            icon: <Plus className="h-4 w-4" />,
            label: "Add Transaction",
            onClick: () => {
              // Will be handled by page component
            },
            variant: "primary" as const,
          },
          {
            icon: <DollarSign className="h-4 w-4" />,
            label: "Pay Credit Card",
            onClick: () => {
              // Will be handled by page component
            },
            variant: "secondary" as const,
          },
        ],
      };
    } else if (pathname?.endsWith("/income")) {
      return {
        title: `${budget?.name ?? "Budget"} - Income`,
        description: "Manage your income sources",
        showBackButton: true,
        actions: [
          {
            icon: <Plus className="h-4 w-4" />,
            label: "Add Income Source",
            onClick: () => {
              // Will be handled by page component
            },
            variant: "primary" as const,
          },
        ],
      };
    } else if (pathname?.endsWith("/categories")) {
      return {
        title: `${budget?.name ?? "Budget"} - Categories`,
        description: "Manage your budget categories",
        showBackButton: true,
        actions: [],
      };
    } else if (pathname?.endsWith("/transactions")) {
      return {
        title: `${budget?.name ?? "Budget"} - Transactions`,
        description: "Track and manage transactions for this budget",
        showBackButton: true,
        actions: [
          {
            icon: <Plus className="h-4 w-4" />,
            label: "Add Transaction",
            onClick: () => {
              // Will be handled by page component
            },
            variant: "primary" as const,
          },
        ],
      };
    } else if (
      pathname?.includes("/cards") &&
      !/\/cards\/[^/]+$/.test(pathname)
    ) {
      // Cards list page
      return {
        title: `${budget?.name ?? "Budget"} - Cards`,
        description: "View and manage cards for this budget",
        showBackButton: true,
        actions: [
          {
            icon: <Plus className="h-4 w-4" />,
            label: "Add Card",
            onClick: () => {
              // Will be handled by page component
            },
            variant: "primary" as const,
          },
          {
            icon: <CreditCard className="h-4 w-4" />,
            label: "Pay Credit Card",
            onClick: () => {
              // Will be handled by page component
            },
            variant: "secondary" as const,
          },
        ],
      };
    } else if (pathname?.includes("/cards/")) {
      // Individual card page
      return {
        title: "Card Details",
        description: "View and manage card transactions",
        showBackButton: true,
        actions: [],
      };
    }

    return null;
  }, [pathname, id, budget]);

  // Determine if header has buttons
  const hasHeaderButtons =
    pageHeaderConfig?.actions && pageHeaderConfig.actions.length > 0;
  const contentPadding = hasHeaderButtons ? "pt-16" : "pt-8";

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {pageHeaderConfig && (
        <PageHeader
          title={pageHeaderConfig.title}
          description={pageHeaderConfig.description}
          backButton={
            pageHeaderConfig.showBackButton
              ? { onClick: () => router.push(`/budgets`) }
              : undefined
          }
          actions={pageHeaderConfig.actions}
        />
      )}

      <BudgetPageNavigation />

      <div className={`flex-1 overflow-hidden ${contentPadding} lg:pt-0`}>
        {children}
      </div>
    </div>
  );
}
