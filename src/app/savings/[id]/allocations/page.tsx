"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { usePageLoading } from "@/components/ConditionalLayout";
import StatsCard from "@/components/StatsCard";
import Pagination from "@/components/Pagination";
import {
  AlertCircle,
  PiggyBank,
  ArrowRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDateUTC } from "@/lib/utils";
import { flattenAllocations } from "@/lib/utils/savings";

const PAGE_SIZE = 20;

const AllocationsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const savingsId = id as string;
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: savings,
    isLoading: savingsLoading,
    error: savingsError,
  } = useSavingsAccount(savingsId);

  // This route keeps the same component instance when the account changes, so
  // reset the page rather than landing on page 3 of a different account.
  useEffect(() => setCurrentPage(1), [savingsId]);

  // Every pocket's allocations as one list, most recent first
  const sortedAllocations = flattenAllocations(savings?.pockets);

  // Paginate the list. The stats below stay across every allocation, not just
  // the visible page. `safePage` keeps the view valid when the list shrinks
  // under the current page (e.g. an allocation is deleted elsewhere).
  const totalPages = Math.max(
    1,
    Math.ceil(sortedAllocations.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const visibleAllocations = sortedAllocations.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Calculate statistics
  const totalAllocations = sortedAllocations.length;
  const totalDeposits = sortedAllocations
    .filter((a) => !a.withdrawal)
    .reduce((sum, a) => sum + a.amount, 0);
  const totalWithdrawals = sortedAllocations
    .filter((a) => a.withdrawal)
    .reduce((sum, a) => sum + a.amount, 0);
  const netAmount = totalDeposits - totalWithdrawals;

  // Show loading state
  usePageLoading(savingsLoading, "Loading allocations...");
  if (savingsLoading) {
    return null;
  }

  // Show error state
  if (savingsError) {
    const errorMessage =
      savingsError &&
      typeof savingsError === "object" &&
      "message" in savingsError
        ? String(savingsError.message)
        : "An unexpected error occurred";
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="mb-2 text-lg font-semibold text-gray-900">
            Error loading allocations
          </div>
          <div className="text-sm text-gray-500">{errorMessage}</div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!savings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
            <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Savings account not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface lg:h-full lg:overflow-hidden">
      <div className="mx-auto w-full flex-shrink-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-4">
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <StatsCard
            title="Total allocations"
            value={totalAllocations}
            subtitle="Across all pockets"
            icon={<PiggyBank className="h-4 w-4 sm:h-5 sm:w-5" />}
            iconColor="text-secondary-600"
          />

          <StatsCard
            title="Total deposits"
            value={formatCurrency(totalDeposits)}
            subtitle="Money in"
            icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />

          <StatsCard
            title="Total withdrawals"
            value={formatCurrency(totalWithdrawals)}
            subtitle="Money out"
            icon={<TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />}
            iconColor="text-red-500"
            valueColor="text-red-600"
          />

          <StatsCard
            title="Net amount"
            value={formatCurrency(netAmount)}
            subtitle="Deposits minus withdrawals"
            icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
            iconColor={netAmount >= 0 ? "text-green-600" : "text-red-500"}
            valueColor={netAmount >= 0 ? "text-green-600" : "text-red-600"}
          />
        </div>
      </div>

      {/* Allocations List - Scrollable */}
      <div className="lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto w-full px-4 pb-28 sm:px-6 lg:px-8 lg:pb-8">
          <div className="card-surface p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                All allocations
              </h3>
            </div>

            <div className="space-y-2 pb-2">
              {visibleAllocations.length > 0 ? (
                visibleAllocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="group flex items-center justify-between rounded-xl border border-gray-200/70 bg-surface p-3 transition-colors duration-200 hover:bg-surface-muted"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!allocation.occurredAt && (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {allocation.note ?? "Allocation"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary-700">
                          {allocation.pocketName}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {allocation.occurredAt
                          ? formatDateUTC(String(allocation.occurredAt))
                          : formatDateUTC(allocation.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold tabular-nums ${
                          allocation.withdrawal
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {allocation.withdrawal ? "-" : "+"}
                        {formatCurrency(allocation.amount)}
                      </span>
                      <button
                        onClick={() =>
                          router.push(
                            `/savings/${savingsId}/pockets/${allocation.pocketId}`,
                          )
                        }
                        className="rounded-lg p-2 text-gray-400 opacity-100 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 lg:opacity-0 lg:group-hover:opacity-100"
                        title="View pocket"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                    <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900">
                    No allocations yet
                  </h4>
                  <p className="text-sm text-gray-500">
                    Allocations will appear here when you add them to pockets
                  </p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 border-t border-gray-200/70 pt-4">
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  hasNextPage={safePage < totalPages}
                  hasPreviousPage={safePage > 1}
                  totalCount={totalAllocations}
                  limit={PAGE_SIZE}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationsPage;
