"use client";

import BudgetPageNavigation from "@/components/budgets/BudgetPageNavigation";
import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useMemo } from "react";
import { BudgetHeaderProvider, useBudgetHeader } from "./BudgetHeaderContext";

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
      };
    } else if (pathname?.endsWith("/income")) {
      return {
        title: `${budget?.name ?? "Budget"} - Income`,
        description: "Manage your income sources",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/categories")) {
      return {
        title: `${budget?.name ?? "Budget"} - Categories`,
        description: "Manage your budget categories",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/transactions")) {
      return {
        title: `${budget?.name ?? "Budget"} - Transactions`,
        description: "Track and manage transactions for this budget",
        showBackButton: true,
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
      };
    } else if (
      pathname?.includes("/cards/") &&
      /\/cards\/[^/]+$/.test(pathname)
    ) {
      // Individual card page - title will be set dynamically by the page
      return {
        title: "Card Details",
        description: "View and manage card transactions",
        showBackButton: true,
      };
    }

    return null;
  }, [pathname, id, budget]);

  // Determine if header has buttons
  const hasHeaderButtons = dynamicActions.length > 0;
  const contentPadding = hasHeaderButtons ? "pt-16" : "pt-8";

  // Use dynamic title/description if provided, otherwise use config
  const finalTitle = dynamicTitle ?? pageHeaderConfig?.title ?? "";
  const finalDescription = dynamicDescription ?? pageHeaderConfig?.description;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {pageHeaderConfig && (
        <PageHeader
          title={finalTitle}
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

      <div className={`flex-1 overflow-hidden ${contentPadding} lg:pt-0`}>
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
