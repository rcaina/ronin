"use client";

import PageHeader from "@/components/PageHeader";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { useMemo, type ReactNode } from "react";

export default function SavingsLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string | undefined;

  const { data: savings } = useSavingsAccount(id ?? "");

  // Configure page header based on current pathname
  const pageHeaderConfig = useMemo(() => {
    if (pathname === `/savings`) {
      // Main savings page - no header needed as page has its own
      return null;
    } else if (id && pathname === `/savings/${id}`) {
      // Savings account detail page (categories/pockets page)
      return {
        title: savings?.name ?? "Savings Account",
        description: savings
          ? `Created ${new Date(savings.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}`
          : "Loading...",
        showBackButton: true,
      };
    }

    return null;
  }, [pathname, id, savings]);

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

      <div
        className={`flex-1 overflow-hidden ${pageHeaderConfig ? "pt-4 sm:pt-20 lg:pt-0" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
