"use client";

import SavingsPageNavigation from "@/components/savings/SavingsPageNavigation";
import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { useMemo } from "react";

export default function SavingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string;

  const { data: savings } = useSavingsAccount(id);

  // Configure page header based on current pathname. Sub-pages show the section
  // name as the title with the account name as a smaller eyebrow above it.
  const pageHeaderConfig = useMemo(() => {
    const savingsName = savings?.name ?? "Savings";
    if (pathname === `/savings/${id}`) {
      // Main savings overview page
      return {
        eyebrow: undefined as string | undefined,
        title: savingsName,
        description: savings
          ? `Created ${new Date(savings.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : "Loading...",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/allocations")) {
      return {
        eyebrow: savingsName,
        title: "Allocations",
        description: "View all allocations across all pockets",
        showBackButton: true,
      };
    }
    // Note: Pocket detail pages are handled by the parent layout at savings/layout.tsx

    return null;
  }, [pathname, id, savings]);

  return (
    <div className="flex h-screen flex-col bg-surface">
      {pageHeaderConfig && (
        <PageHeader
          title={pageHeaderConfig.title}
          eyebrow={pageHeaderConfig.eyebrow}
          description={pageHeaderConfig.description}
          backButton={
            pageHeaderConfig.showBackButton
              ? { onClick: () => router.push(`/savings`) }
              : undefined
          }
        />
      )}

      <SavingsPageNavigation />

      <div className="flex-1 overflow-hidden pt-3 lg:pt-0">{children}</div>
    </div>
  );
}
