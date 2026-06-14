"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useSavingsAccount } from "@/lib/data-hooks/savings/useSavings";
import { useCreatePocket } from "@/lib/data-hooks/savings/usePockets";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import PocketCard from "@/components/savings/PocketCard";
import AddPocketModal from "@/components/savings/AddPocketModal";
import Button from "@/components/Button";
import { toast } from "react-hot-toast";
import type { CreatePocketSchema } from "@/lib/api-schemas/savings";
import { AlertCircle, PiggyBank, Target, DollarSign, Plus } from "lucide-react";
import { formatCurrency, roundToCents } from "@/lib/utils";
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
    refetch,
  } = useSavingsAccount(savingsId);
  const [isAddingPocket, setIsAddingPocket] = useState(false);
  const createPocketMutation = useCreatePocket();

  const handleSubmitAddPocket = async (data: CreatePocketSchema) => {
    try {
      await createPocketMutation.mutateAsync(data);
      setIsAddingPocket(false);
      toast.success("Pocket added successfully!");
      void refetch();
    } catch (error) {
      console.error("Failed to add pocket:", error);
      toast.error("Failed to add pocket. Please try again.");
    }
  };

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

  // Per-pocket goal progress (pockets with a goal set)
  const pocketGoalProgressData =
    savings?.pockets
      ?.filter((p) => typeof p.goalAmount === "number" && p.goalAmount > 0)
      .map((p) => {
        const total = typeof p.total === "number" ? p.total : 0;
        const goal = p.goalAmount!;
        return {
          id: p.id,
          name: p.name,
          total,
          goal,
          percentage: roundToCents((total / goal) * 100),
        };
      })
      .sort((a, b) => b.percentage - a.percentage) ?? [];

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
    <div className="bg-surface lg:h-full lg:overflow-y-auto">
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

        {/* Charts — swipeable row on mobile, grid on larger screens */}
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:gap-6">
          {/* Savings by pocket donut */}
          <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0 sm:p-5">
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

          {/* Goal progress — overall + per pocket */}
          {totalGoalAmount > 0 && (
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Goal progress
                </h3>
                <span className="text-xs font-medium tabular-nums text-gray-500">
                  {totalProgressPercentage.toFixed(1)}% complete
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    totalProgressPercentage >= 100
                      ? "bg-green-500"
                      : "bg-secondary"
                  }`}
                  style={{ width: `${totalProgressPercentage}%` }}
                ></div>
              </div>
              <div className="mt-4 space-y-3">
                {pocketGoalProgressData.map((pocket) => (
                  <div key={pocket.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-gray-900">
                        {pocket.name}
                      </span>
                      <span className="flex-shrink-0 text-xs tabular-nums text-gray-500">
                        {formatCurrency(pocket.total)} /{" "}
                        {formatCurrency(pocket.goal)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          pocket.percentage >= 100
                            ? "bg-green-500"
                            : "bg-secondary"
                        }`}
                        style={{
                          width: `${Math.min(pocket.percentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pockets */}
        <div className="mt-4 sm:mt-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                Pockets
              </h3>
              <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium tabular-nums text-secondary-700">
                {savings.pockets?.length ?? 0}
              </span>
            </div>
            <Button onClick={() => setIsAddingPocket(true)}>
              <Plus className="h-4 w-4" />
              <span>Add pocket</span>
            </Button>
          </div>

          {savings.pockets && savings.pockets.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
              {savings.pockets.map((pocket) => (
                <PocketCard
                  key={pocket.id}
                  pocket={pocket}
                  savingsId={savingsId}
                />
              ))}
            </div>
          ) : (
            <div className="card-surface flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                No pockets yet
              </h3>
              <p className="text-sm text-gray-500">
                Pockets help you organize savings toward specific goals
              </p>
              <Button onClick={() => setIsAddingPocket(true)}>
                <Plus className="h-4 w-4" />
                <span>Add pocket</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Pocket Modal */}
      <AddPocketModal
        isOpen={isAddingPocket}
        onClose={() => setIsAddingPocket(false)}
        onSubmit={handleSubmitAddPocket}
        isLoading={createPocketMutation.isPending}
        savingsId={savingsId}
      />
    </div>
  );
};

export default SavingsCategoriesPage;
