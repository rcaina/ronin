"use client";

import SavingsPageNavigation from "@/components/savings/SavingsPageNavigation";
import PageHeader from "@/components/PageHeader";
import { useParams, usePathname } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { useBackNavigation } from "@/lib/utils/navigation-history";
import { useMemo } from "react";

export default function SavingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;

  const { data: savings } = useSavingsAccount(id);

  // Configure page header based on current pathname. Sub-pages show the section
  // name as the title with the account name as a smaller eyebrow above it.
  const pageHeaderConfig = useMemo(() => {
    const savingsName = savings?.name ?? "Savings";
    if (pathname === `/savings/${id}`) {
      // Main savings overview page — its parent is the savings list.
      return {
        eyebrow: undefined as string | undefined,
        title: savingsName,
        description: savings
          ? `Created ${new Date(savings.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : "Loading...",
        showBackButton: true,
        backTo: `/savings`,
      };
    } else if (pathname?.endsWith("/allocations")) {
      return {
        eyebrow: savingsName,
        title: "Allocations",
        description: "View all allocations across all pockets",
        showBackButton: true,
        backTo: `/savings/${id}`,
      };
    }
    // Note: Pocket detail pages are handled by the parent layout at savings/layout.tsx

    return null;
  }, [pathname, id, savings]);

  // Scoped history: back returns to the previous page within this savings
  // account (e.g. a pocket -> back = the account overview), falling back to
  // this page's logical parent (`backTo`) when the previous page was
  // outside this account — see useBackNavigation.
  const handleBack = useBackNavigation(
    pageHeaderConfig?.backTo ?? `/savings`,
    `/savings/${id}`,
  );

  return (
    <div className="flex flex-col bg-surface lg:h-screen">
      {pageHeaderConfig && (
        <PageHeader
          title={pageHeaderConfig.title}
          eyebrow={pageHeaderConfig.eyebrow}
          description={pageHeaderConfig.description}
          backButton={
            pageHeaderConfig.showBackButton
              ? { onClick: handleBack }
              : undefined
          }
        />
      )}

      <SavingsPageNavigation />

      <div className="pt-4 lg:flex-1 lg:overflow-hidden lg:pt-0">
        {children}
      </div>
    </div>
  );
}
