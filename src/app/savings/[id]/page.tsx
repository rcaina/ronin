"use client";

import { useParams } from "next/navigation";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import { AlertCircle, PiggyBank, Target, DollarSign } from "lucide-react";
import { roundToCents } from "@/lib/utils";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  CHART_COLORS,
  ChartEmptyState,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  formatChartCurrency,
} from "@/components/recharts/theme";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

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

  // Donut breakdown of savings by pocket (uses data already on the page)
  const pocketBreakdownData =
    savings?.pockets
      ?.filter((p) => typeof p.total === "number" && p.total > 0)
      .map((p) => ({ name: p.name, value: p.total })) ?? [];

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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="mb-2 text-lg font-semibold text-gray-900">
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
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <StatsCard
            title="Total saved"
            value={`$${totalSaved.toFixed(2).toLocaleString()}`}
            subtitle="Across all pockets"
            icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />

          <StatsCard
            title="Total pockets"
            value={totalPockets}
            subtitle="Categories created"
            icon={<PiggyBank className="h-4 w-4 sm:h-5 sm:w-5" />}
            iconColor="text-secondary-600"
          />

          {totalGoalAmount > 0 && (
            <StatsCard
              title="Goal progress"
              value={`${totalProgressPercentage.toFixed(0)}%`}
              subtitle={`${pocketsReachedGoal}/${pocketsWithGoals} goals reached`}
              icon={<Target className="h-4 w-4 sm:h-5 sm:w-5" />}
              iconColor="text-secondary-600"
              valueColor={
                totalProgressPercentage >= 100
                  ? "text-green-600"
                  : "text-gray-900"
              }
            />
          )}

          {totalGoalAmount > 0 && (
            <StatsCard
              title="Total goal"
              value={`$${totalGoalAmount.toFixed(2).toLocaleString()}`}
              subtitle="Combined goal amount"
              icon={<Target className="h-4 w-4 sm:h-5 sm:w-5" />}
              iconColor="text-gray-500"
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Savings by pocket donut */}
          <div className="card-surface p-4 sm:p-5">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Savings by pocket
            </h3>
            {pocketBreakdownData.length > 0 ? (
              <>
                <ChartContainer height={170}>
                  <PieChart>
                    <Pie
                      data={pocketBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={3}
                      cornerRadius={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pocketBreakdownData.map((entry, index) => (
                        <Cell
                          key={`pocket-cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                      formatter={(value: number | undefined, name?: string) => {
                        if (value === undefined) return ["", name ?? ""];
                        const total = pocketBreakdownData.reduce(
                          (sum, item) => sum + item.value,
                          0,
                        );
                        const percentage =
                          total > 0 ? (value / total) * 100 : 0;
                        return [
                          `${formatChartCurrency(value)} (${percentage.toFixed(1)}%)`,
                          name ?? "",
                        ];
                      }}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                  {pocketBreakdownData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-gray-500">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ChartEmptyState icon={PiggyBank} message="No savings yet" />
            )}
          </div>

          {/* Overall Progress Bar */}
          {totalGoalAmount > 0 && (
            <div className="card-surface p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Overall goal progress
                </h3>
                <span className="text-xs font-medium tabular-nums text-gray-500">
                  {totalProgressPercentage.toFixed(1)}% complete
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:h-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
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
    </div>
  );
};

export default SavingsCategoriesPage;
