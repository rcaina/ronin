"use client";

import { useParams, useRouter } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AlertCircle, PiggyBank, DollarSign, ArrowRight } from "lucide-react";
import { formatCurrency, formatDateUTC } from "@/lib/utils";
import type { AllocationSummary } from "@/lib/types/savings";

const AllocationsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const savingsId = id as string;

  const {
    data: savings,
    isLoading: savingsLoading,
    error: savingsError,
  } = useSavingsAccount(savingsId);

  // Collect all allocations from all pockets
  const allAllocations: Array<
    AllocationSummary & { pocketName: string; pocketId: string }
  > =
    savings?.pockets?.flatMap((pocket) =>
      (pocket.allocations ?? []).map((allocation) => ({
        ...allocation,
        pocketName: pocket.name,
        pocketId: pocket.id,
      })),
    ) ?? [];

  // Allocations are already sorted by the backend (most recent first)
  const sortedAllocations = allAllocations;

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
  if (savingsLoading) {
    return <LoadingSpinner message="Loading allocations..." />;
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
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
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
          <div className="mb-4 text-gray-400">
            <PiggyBank className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Savings account not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto w-full flex-shrink-0 px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 sm:text-sm">
                  Total Allocations
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900 sm:text-2xl">
                  {totalAllocations}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 sm:text-sm">
                  Total Deposits
                </p>
                <p className="mt-1 text-lg font-semibold text-green-600 sm:text-2xl">
                  {formatCurrency(totalDeposits)}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-green-500 sm:h-6 sm:w-6" />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 sm:text-sm">
                  Total Withdrawals
                </p>
                <p className="mt-1 text-lg font-semibold text-red-600 sm:text-2xl">
                  {formatCurrency(totalWithdrawals)}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-red-500 sm:h-6 sm:w-6" />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 sm:text-sm">Net Amount</p>
                <p
                  className={`mt-1 text-lg font-semibold sm:text-2xl ${
                    netAmount >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(netAmount)}
                </p>
              </div>
              <DollarSign
                className={`h-5 w-5 sm:h-6 sm:w-6 ${
                  netAmount >= 0 ? "text-green-500" : "text-red-500"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Allocations List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-2 pb-8 sm:px-4 sm:pb-12 lg:px-8 lg:pb-16">
          <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                All Allocations
              </h3>
            </div>

            <div className="space-y-2 pb-2">
              {sortedAllocations.length > 0 ? (
                sortedAllocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="group flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {!allocation.occurredAt && (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {allocation.note ?? "Allocation"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {allocation.pocketName}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {allocation.occurredAt
                          ? formatDateUTC(String(allocation.occurredAt))
                          : formatDateUTC(allocation.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${
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
                        className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                        title="View pocket"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="text-center text-sm text-gray-500">
                    <p>No allocations yet</p>
                    <p className="mt-1 text-xs">
                      Allocations will appear here when you add them to pockets
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationsPage;
