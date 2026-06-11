"use client";

import BudgetPageNavigation from "@/components/budgets/BudgetPageNavigation";
import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useMemo } from "react";
import {
  BudgetHeaderProvider,
  useBudgetHeader,
} from "../../../../components/budgets/BudgetHeaderContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string;

  const { data: budget } = useBudget(id);
  const {
    actions: dynamicActions,
    title: dynamicTitle,
    description: dynamicDescription,
  } = useBudgetHeader();

  // Configure page header based on current pathname. Sub-pages show the section
  // name as the title with the budget name as a smaller eyebrow above it.
  const pageHeaderConfig = useMemo(() => {
    const budgetName = budget?.name ?? "Budget";
    if (pathname === `/budgets/${id}`) {
      // Main budget overview page
      return {
        eyebrow: undefined as string | undefined,
        title: budgetName,
        description: budget
          ? `${budget.period.replace("_", " ")} Budget • ${new Date(budget.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : "Loading...",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/income")) {
      return {
        eyebrow: budgetName,
        title: "Income",
        description: "Manage your income sources",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/categories")) {
      return {
        eyebrow: budgetName,
        title: "Categories",
        description: "Manage your budget categories",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/transactions")) {
      return {
        eyebrow: budgetName,
        title: "Transactions",
        description: "Track and manage transactions for this budget",
        showBackButton: true,
      };
    } else if (
      pathname?.includes("/cards") &&
      !/\/cards\/[^/]+$/.test(pathname)
    ) {
      // Cards list page
      return {
        eyebrow: budgetName,
        title: "Cards",
        description: "View and manage cards for this budget",
        showBackButton: true,
      };
    } else if (
      pathname?.includes("/cards/") &&
      /\/cards\/[^/]+$/.test(pathname)
    ) {
      // Individual card page - title is set dynamically by the page
      return {
        eyebrow: budgetName,
        title: "Card details",
        description: "View and manage card transactions",
        showBackButton: true,
      };
    }

    return null;
  }, [pathname, id, budget]);

  // Use dynamic title/description if provided, otherwise use config
  const finalTitle = dynamicTitle ?? pageHeaderConfig?.title ?? "";
  const finalDescription = dynamicDescription ?? pageHeaderConfig?.description;

  return (
    <div className="flex h-screen flex-col bg-surface">
      {pageHeaderConfig && (
        <PageHeader
          title={finalTitle}
          eyebrow={pageHeaderConfig.eyebrow}
          description={finalDescription}
          backButton={
            pageHeaderConfig.showBackButton
              ? { onClick: () => router.push(`/budgets`) }
              : undefined
          }
          actions={dynamicActions}
        />
      )}

      <BudgetPageNavigation />

      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 lg:pt-0">
        {children}
      </div>
    </div>
  );
}

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BudgetHeaderProvider>
      <LayoutContent>{children}</LayoutContent>
    </BudgetHeaderProvider>
  );
}
