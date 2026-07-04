"use client";

import BudgetPageNavigation from "@/components/budgets/BudgetPageNavigation";
import PageHeader from "@/components/PageHeader";
import { useParams, usePathname } from "next/navigation";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useBackNavigation } from "@/lib/utils/navigation-history";
import { useMemo } from "react";
import {
  BudgetHeaderProvider,
  useBudgetHeader,
} from "../../../../components/budgets/BudgetHeaderContext";
import { usePageIsLoading } from "@/components/ConditionalLayout";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;
  const pageLoading = usePageIsLoading();

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
      // Main budget overview page — its parent is the budgets list.
      return {
        eyebrow: undefined as string | undefined,
        title: budgetName,
        description: budget
          ? `${budget.period.replace("_", " ")} Budget • ${new Date(budget.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : "Loading...",
        showBackButton: true,
        backTo: `/budgets`,
      };
    } else if (pathname?.endsWith("/income")) {
      return {
        eyebrow: budgetName,
        title: "Income",
        description: "Manage your income sources",
        showBackButton: true,
        backTo: `/budgets/${id}`,
      };
    } else if (pathname?.endsWith("/categories")) {
      return {
        eyebrow: budgetName,
        title: "Categories",
        description: "Manage your budget categories",
        showBackButton: true,
        backTo: `/budgets/${id}`,
      };
    } else if (pathname?.endsWith("/transactions")) {
      return {
        eyebrow: budgetName,
        title: "Transactions",
        description: "Track and manage transactions for this budget",
        showBackButton: true,
        backTo: `/budgets/${id}`,
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
        backTo: `/budgets/${id}`,
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
        backTo: `/budgets/${id}/cards`,
      };
    }

    return null;
  }, [pathname, id, budget]);

  // Scoped history: back returns to the previous page within this budget
  // (e.g. Categories -> Cards -> back = Categories), falling back to this
  // page's logical parent (`backTo`) when the previous page was outside the
  // budget (a different budget, the budgets list, the dashboard, etc.) —
  // see useBackNavigation.
  const handleBack = useBackNavigation(
    pageHeaderConfig?.backTo ?? `/budgets`,
    `/budgets/${id}`,
  );

  // Use dynamic title/description if provided, otherwise use config
  const finalTitle = dynamicTitle ?? pageHeaderConfig?.title ?? "";
  const finalDescription = dynamicDescription ?? pageHeaderConfig?.description;

  return (
    <div className="flex flex-col bg-surface lg:h-screen">
      {/*
        Hide this section's chrome (header + sub-nav tabs) while the page is
        loading so the single shell spinner is all that shows — matching the
        dashboard's loading look. The chrome's fixed/sticky mobile nav (z-50)
        would otherwise float above the content overlay.
      */}
      {!pageLoading && (
        <>
          {pageHeaderConfig && (
            <PageHeader
              title={finalTitle}
              eyebrow={pageHeaderConfig.eyebrow}
              description={finalDescription}
              backButton={
                pageHeaderConfig.showBackButton
                  ? { onClick: handleBack }
                  : undefined
              }
              actions={dynamicActions}
            />
          )}

          <BudgetPageNavigation />
        </>
      )}

      <div className="pt-4 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:pt-0">
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
