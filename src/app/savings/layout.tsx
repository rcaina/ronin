"use client";

import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { usePocket } from "@/lib/data-hooks/savings/usePocket";
import { useMemo, type ReactNode } from "react";
import {
  PocketHeaderProvider,
  usePocketHeader,
} from "@/components/savings/PocketHeaderContext";

function PocketDetailLayoutContent({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string | undefined;
  const pocketId = params.pocketId as string | undefined;

  const { data: savings } = useSavingsAccount(id ?? "");
  const { data: pocket } = usePocket(pocketId ?? "");
  const { action: pocketAction } = usePocketHeader();

  // Configure page header for pocket detail page
  const pageHeaderConfig = useMemo(() => {
    if (
      id &&
      pocketId &&
      pathname?.includes(`/savings/${id}/pockets/${pocketId}`)
    ) {
      return {
        title: pocket?.name ?? "Pocket",
        description: savings
          ? `${savings.name} • View and manage allocations`
          : "Loading...",
        showBackButton: true,
        backTo: `/savings/${id}`,
      };
    }
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
          action={
            pocketAction
              ? {
                  label: pocketAction.label,
                  onClick: pocketAction.onClick,
                  icon: pocketAction.icon,
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

function DefaultLayoutContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export default function SavingsLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string | undefined;
  const pocketId = params.pocketId as string | undefined;

  // Only wrap in PocketHeaderProvider for pocket detail pages
  const isPocketDetailPage =
    id && pocketId && pathname?.includes(`/savings/${id}/pockets/${pocketId}`);

  if (isPocketDetailPage) {
    return (
      <PocketHeaderProvider>
        <PocketDetailLayoutContent>{children}</PocketDetailLayoutContent>
      </PocketHeaderProvider>
    );
  }

  return <DefaultLayoutContent>{children}</DefaultLayoutContent>;
}
