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

  // Configure page header based on current pathname
  const pageHeaderConfig = useMemo(() => {
    if (pathname === `/savings/${id}`) {
      // Main savings overview page
      return {
        title: savings?.name ?? "Savings",
        description: savings
          ? `Created ${new Date(savings.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
          : "Loading...",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/pockets")) {
      return {
        title: `${savings?.name ?? "Savings"} - Pockets`,
        description: "Manage your savings pockets",
        showBackButton: true,
      };
    } else if (pathname?.endsWith("/allocations")) {
      return {
        title: `${savings?.name ?? "Savings"} - Allocations`,
        description: "View all allocations across all pockets",
        showBackButton: true,
      };
    } else if (
      pathname?.includes("/pockets/") &&
      /\/pockets\/[^/]+$/.test(pathname)
    ) {
      // Individual pocket page - title will be set dynamically by the page
      return {
        title: "Pocket Details",
        description: "View and manage pocket allocations",
        showBackButton: true,
      };
    }

    return null;
  }, [pathname, id, savings]);

  // Determine content padding
  const contentPadding = "pt-8";

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {pageHeaderConfig && (
        <PageHeader
          title={pageHeaderConfig.title}
          description={pageHeaderConfig.description}
          backButton={
            pageHeaderConfig.showBackButton
              ? { onClick: () => router.push(`/savings`) }
              : undefined
          }
        />
      )}

      <SavingsPageNavigation />

      <div className={`flex-1 overflow-hidden ${contentPadding} lg:pt-0`}>
        {children}
      </div>
    </div>
  );
}
