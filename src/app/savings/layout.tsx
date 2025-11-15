"use client";

import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { usePocket } from "@/lib/data-hooks/savings/usePocket";
import { useMemo, type ReactNode } from "react";

export default function SavingsLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string | undefined;
  const pocketId = params.pocketId as string | undefined;

  const { data: savings } = useSavingsAccount(id ?? "");
  const { data: pocket } = usePocket(pocketId ?? "");

  // Configure page header based on current pathname
  // Note: The child layout at savings/[id]/layout.tsx handles headers for:
  // - /savings/[id] (overview)
  // - /savings/[id]/pockets
  // - /savings/[id]/allocations
  const pageHeaderConfig = useMemo(() => {
    if (pathname === `/savings`) {
      // Main savings page - no header needed as page has its own
      return null;
    } else if (
      id &&
      pocketId &&
      pathname?.includes(`/savings/${id}/pockets/${pocketId}`)
    ) {
      // Pocket detail page
      return {
        title: pocket?.name ?? "Pocket",
        description: savings
          ? `${savings.name} • View and manage allocations`
          : "Loading...",
        showBackButton: true,
        backTo: `/savings/${id}`,
      };
    }

    // All other paths are handled by child layouts
    return null;
  }, [pathname, id, pocketId, savings, pocket]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {pageHeaderConfig && (
        <PageHeader
          title={pageHeaderConfig.title}
          description={pageHeaderConfig.description}
          backButton={
            pageHeaderConfig.showBackButton
              ? {
                  onClick: () =>
                    router.push(pageHeaderConfig.backTo ?? `/savings`),
                }
              : undefined
          }
        />
      )}

      <div
        className={`flex-1 overflow-hidden ${pageHeaderConfig ? "pt-4 sm:pt-20 lg:pt-0" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
