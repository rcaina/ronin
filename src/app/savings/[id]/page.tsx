"use client";

import { useParams } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import { AlertCircle, PiggyBank, Target, DollarSign } from "lucide-react";
import { roundToCents } from "@/lib/utils";

const SavingsCategoriesPage = () => {
  const { id } = useParams();
  const savingsId = id as string;
  const {
    data: savings,
    isLoading: savingsLoading,
    error: savingsError,
  } = useSavingsAccount(savingsId);

  // Calculate statistics
  const totalPockets = savings?.pockets?.length ?? 0;
  const totalSaved =
    typeof savings?.total === "number" && !isNaN(savings.total)
      ? savings.total
      : 0;
  const totalGoalAmount = roundToCents(
    savings?.pockets?.reduce((sum, pocket) => {
      // Safe type check for goalAmount - use Number() to ensure numeric conversion
      const goalValue =
        pocket.goalAmount != null &&
        typeof pocket.goalAmount === "number" &&
        !isNaN(pocket.goalAmount)
          ? Number(pocket.goalAmount)
          : 0;
      return goalValue > 0 ? sum + goalValue : sum;
    }, 0) ?? 0,
  );
  const totalProgress =
    totalGoalAmount > 0 ? (totalSaved / totalGoalAmount) * 100 : 0;
  const totalProgressPercentage = roundToCents(Math.min(totalProgress, 100));

  // Count pockets with goals
  const pocketsWithGoals =
    savings?.pockets?.filter((p) => {
      return (
        p.goalAmount !== null &&
        p.goalAmount !== undefined &&
        typeof p.goalAmount === "number" &&
        p.goalAmount > 0
      );
    }).length ?? 0;
  const pocketsReachedGoal =
    savings?.pockets?.filter((p) => {
      if (
        p.goalAmount !== null &&
        p.goalAmount !== undefined &&
        typeof p.goalAmount === "number" &&
        p.goalAmount > 0 &&
        typeof p.total === "number"
      ) {
        return p.total >= p.goalAmount;
      }
      return false;
    }).length ?? 0;

  // Show loading state
  if (savingsLoading) {
    return <LoadingSpinner message="Loading savings account..." />;
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
            Error loading savings account
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <StatsCard
            title="Total Saved"
            value={`$${totalSaved.toFixed(2).toLocaleString()}`}
            subtitle="Across all pockets"
            icon={
              <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
            }
            iconColor="text-green-500"
            valueColor="text-green-600"
          />

          <StatsCard
            title="Total Pockets"
            value={totalPockets}
            subtitle="Categories created"
            icon={<PiggyBank className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />}
            iconColor="text-blue-500"
            valueColor="text-blue-600"
          />

          {totalGoalAmount > 0 && (
            <StatsCard
              title="Goal Progress"
              value={`${totalProgressPercentage.toFixed(0)}%`}
              subtitle={`${pocketsReachedGoal}/${pocketsWithGoals} goals reached`}
              icon={
                <Target className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-purple-500"
              valueColor={
                totalProgressPercentage >= 100
                  ? "text-green-600"
                  : "text-purple-600"
              }
            />
          )}

          {totalGoalAmount > 0 && (
            <StatsCard
              title="Total Goal"
              value={`$${totalGoalAmount.toFixed(2).toLocaleString()}`}
              subtitle="Combined goal amount"
              icon={<Target className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />}
              iconColor="text-gray-500"
            />
          )}
        </div>

        {/* Overall Progress Bar */}
        {totalGoalAmount > 0 && (
          <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
            <div className="mb-2 flex items-center justify-between sm:mb-4">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                Overall Goal Progress
              </h3>
              <span className="text-xs text-gray-500 sm:text-sm">
                {totalProgressPercentage.toFixed(1)}% complete
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 sm:h-3">
              <div
                className={`h-2 rounded-full transition-all duration-300 sm:h-3 ${
                  totalProgressPercentage >= 100
                    ? "bg-green-500"
                    : "bg-secondary"
                }`}
                style={{ width: `${totalProgressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavingsCategoriesPage;
