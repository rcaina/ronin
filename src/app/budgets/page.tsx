"use client";

import { useState, useMemo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Target,
  Archive,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useActiveBudgets,
  useCompletedBudgets,
  useArchivedBudgets,
  useMarkBudgetCompleted,
  useMarkBudgetArchived,
  useReactivateBudget,
} from "@/lib/data-hooks/budgets/useBudgets";
import { useDeleteBudget } from "@/lib/data-hooks/budgets/useBudgets";
import type { BudgetWithRelations } from "@/lib/types/budget";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { CategoryType } from "@prisma/client";
import Button from "@/components/Button";
import { roundToCents } from "@/lib/utils";
import {
  calculateBudgetSpent,
  calculateSpendingPercentage,
  calculateTotalIncome,
} from "@/lib/utils/spending";
import { useBudgetStats } from "@/lib/data-hooks/budgets/useBudgetStats";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  CHART_COLORS,
  ChartEmptyState,
  chartAxisProps,
  chartGridProps,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  formatCompactCurrency,
} from "@/components/recharts/theme";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

type TabType = "active" | "completed" | "archived";

const BudgetsPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [budgetToDelete, setBudgetToDelete] =
    useState<BudgetWithRelations | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [budgetToDuplicate, setBudgetToDuplicate] =
    useState<BudgetWithRelations | null>(null);

  // Data hooks for different budget statuses (excluding card payments for calculations)
  const { data: activeBudgetsData, isLoading: activeLoading } =
    useActiveBudgets(true);
  const { data: completedBudgetsData, isLoading: completedLoading } =
    useCompletedBudgets(true);
  const { data: archivedBudgetsData, isLoading: archivedLoading } =
    useArchivedBudgets(true);

  // Ensure budgets are always arrays (memoized to avoid unnecessary re-renders)
  const activeBudgets = useMemo(
    () => (Array.isArray(activeBudgetsData) ? activeBudgetsData : []),
    [activeBudgetsData],
  );
  const completedBudgets = useMemo(
    () => (Array.isArray(completedBudgetsData) ? completedBudgetsData : []),
    [completedBudgetsData],
  );
  const archivedBudgets = useMemo(
    () => (Array.isArray(archivedBudgetsData) ? archivedBudgetsData : []),
    [archivedBudgetsData],
  );

  // Mutation hooks
  const deleteBudgetMutation = useDeleteBudget();
  const markCompletedMutation = useMarkBudgetCompleted();
  const markArchivedMutation = useMarkBudgetArchived();
  const reactivateMutation = useReactivateBudget();

  // Get current budgets based on active tab
  const currentBudgets = useMemo(() => {
    switch (activeTab) {
      case "active":
        return activeBudgets;
      case "completed":
        return completedBudgets;
      case "archived":
        return archivedBudgets;
      default:
        return activeBudgets;
    }
  }, [activeTab, activeBudgets, completedBudgets, archivedBudgets]);

  const isLoading = activeLoading || completedLoading || archivedLoading;

  // Aggregate statistics across active budgets (plus completed/archived counts)
  const budgetStats = useBudgetStats(
    activeBudgets,
    completedBudgets,
    archivedBudgets,
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading budgets..." />;
  }

  const getBudgetStatus = (budget: BudgetWithRelations) => {
    const totalBudgetIncome = calculateTotalIncome(budget);
    const totalBudgetSpent = roundToCents(calculateBudgetSpent(budget));

    const percentage = roundToCents(
      calculateSpendingPercentage(totalBudgetSpent, totalBudgetIncome),
    );

    if (percentage > 100)
      return {
        label: "Over budget",
        chip: "bg-red-50 text-red-700",
        bar: "bg-red-500",
      };
    if (percentage < 100)
      return {
        label: "In progress",
        chip: "bg-secondary-100 text-secondary-800",
        bar: "bg-secondary",
      };
    return {
      label: "Complete",
      chip: "bg-green-50 text-green-700",
      bar: "bg-green-500",
    };
  };

  const getCategorySummary = (budget: BudgetWithRelations) => {
    const categories = budget.categories ?? [];
    const needs = categories.filter(
      (cat) => cat.group === CategoryType.NEEDS,
    ).length;
    const wants = categories.filter(
      (cat) => cat.group === CategoryType.WANTS,
    ).length;
    const investments = categories.filter(
      (cat) => cat.group === CategoryType.INVESTMENT,
    ).length;

    return { needs, wants, investments };
  };

  const handleDuplicateBudget = (budget: BudgetWithRelations) => {
    setBudgetToDuplicate(budget);
    setIsCreateModalOpen(true);
  };

  const handleDeleteBudget = (budget: BudgetWithRelations) => {
    setBudgetToDelete(budget);
  };

  const handleMarkCompleted = async (budget: BudgetWithRelations) => {
    try {
      await markCompletedMutation.mutateAsync(budget.id);
      toast.success("Budget marked as completed!");
    } catch (err) {
      toast.error("Failed to mark budget as completed. Please try again.");
      console.error("Failed to mark budget as completed:", err);
    }
  };

  const handleMarkArchived = async (budget: BudgetWithRelations) => {
    try {
      await markArchivedMutation.mutateAsync(budget.id);
      toast.success("Budget archived!");
    } catch (err) {
      toast.error("Failed to archive budget. Please try again.");
      console.error("Failed to archive budget:", err);
    }
  };

  const handleReactivate = async (budget: BudgetWithRelations) => {
    try {
      await reactivateMutation.mutateAsync(budget.id);
      toast.success("Budget reactivated!");
    } catch (err) {
      toast.error("Failed to reactivate budget. Please try again.");
      console.error("Failed to reactivate budget:", err);
    }
  };

  const tabs = [
    { id: "active" as TabType, label: "Active", count: activeBudgets.length },
    {
      id: "completed" as TabType,
      label: "Completed",
      count: completedBudgets.length,
    },
    {
      id: "archived" as TabType,
      label: "Archived",
      count: archivedBudgets.length,
    },
  ];

  return (
    <div className="flex flex-col bg-surface pt-16 sm:pt-8 lg:h-screen lg:pt-0">
      <PageHeader
        title="Budgets"
        description="Manage budgets and track spending"
        action={{
          icon: <Plus className="h-4 w-4" />,
          label: "Create budget",
          onClick: () => setIsCreateModalOpen(true),
        }}
      />

      <div className="flex flex-col lg:flex-1 lg:overflow-hidden">
        <div className="mx-auto w-full flex-shrink-0 px-4 py-4 sm:px-6 lg:px-8">
          {/* Budget overview charts — swipeable row on mobile, grid on larger screens */}
          <div className="scrollbar-hide mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
            {/* Spending by category group donut */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Spending by group
              </h3>
              {budgetStats.pieChartData.length > 0 ? (
                <>
                  <ChartContainer height={150}>
                    <PieChart>
                      <Pie
                        data={budgetStats.pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={3}
                        cornerRadius={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {budgetStats.pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(
                          value: number | undefined,
                          name?: string,
                        ) => {
                          if (value === undefined) return ["", name ?? ""];

                          // Calculate total from all data points
                          const total = budgetStats.pieChartData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          );

                          // Calculate percentage
                          const percentage =
                            total > 0 ? (value / total) * 100 : 0;

                          return [
                            `$${value.toLocaleString()} (${percentage.toFixed(1)}%)`,
                            name ?? "",
                          ];
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                    {budgetStats.pieChartData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-500">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <ChartEmptyState icon={Target} message="No data yet" />
              )}
            </div>

            {/* Top spending categories */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Top categories
              </h3>
              {budgetStats.topCategoriesData.length > 0 ? (
                <ChartContainer height={170}>
                  <BarChart data={budgetStats.topCategoriesData}>
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      height={48}
                      {...chartAxisProps}
                      fontSize={9}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        typeof value === "number"
                          ? formatCompactCurrency(value)
                          : ""
                      }
                      {...chartAxisProps}
                      fontSize={9}
                      width={42}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(185, 161, 94, 0.08)" }}
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                      formatter={(
                        value: number | undefined,
                        payload: unknown,
                      ) => {
                        if (value === undefined) return "";
                        const payloadData = payload as
                          | { payload?: { fullName?: string } }
                          | undefined;
                        const fullName = payloadData?.payload?.fullName ?? "";
                        return [
                          `$${value.toLocaleString()}`,
                          fullName ?? "Category",
                        ];
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill={CHART_COLORS[0]}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState icon={Target} message="No data yet" />
              )}
            </div>

            {/* Daily spending trend */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Daily spending
              </h3>
              {budgetStats.dailySpendingData.length > 0 &&
              budgetStats.dailySpendingData.some((d) => d.spending > 0) ? (
                <ChartContainer height={170}>
                  <AreaChart data={budgetStats.dailySpendingData}>
                    <defs>
                      <linearGradient
                        id="dailySpendingFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART_COLORS[0]}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART_COLORS[0]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis
                      dataKey="day"
                      {...chartAxisProps}
                      fontSize={9}
                      height={24}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        typeof value === "number"
                          ? formatCompactCurrency(value)
                          : ""
                      }
                      {...chartAxisProps}
                      fontSize={9}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                      formatter={(
                        value: number | undefined,
                        payload: unknown,
                      ) => {
                        if (value === undefined) return "";
                        const payloadData = payload as
                          | { payload?: { date?: string } }
                          | undefined;
                        const date = payloadData?.payload?.date ?? "";
                        return [
                          `$${value.toLocaleString()}`,
                          date ? `Spending (${date})` : "Spending",
                        ];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spending"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      fill="url(#dailySpendingFill)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState icon={TrendingUp} message="No spending data" />
              )}
            </div>

            {/* Active budgets summary */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-secondary-600" />
                    <span className="text-xs text-gray-500">Active</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    {budgetStats.activeBudgetsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-gray-500">Completed</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    {completedBudgets.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-secondary-600" />
                    <span className="text-xs text-gray-500">Last 7 days</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    ${budgetStats.recentSpending.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary-600" />
                    <span className="text-xs text-gray-500">Daily avg</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    ${budgetStats.averageDailySpending.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status tabs — segmented control */}
          <div className="mb-1 flex-shrink-0">
            <div className="inline-flex rounded-full bg-surface-muted p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-soft"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                      activeTab === tab.id
                        ? "bg-secondary/15 text-secondary-700"
                        : "bg-gray-200/70 text-gray-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Budgets List - Scrollable */}
        <div className="overflow-y-auto lg:flex-1">
          <div className="mx-auto w-full px-4 py-3 pb-28 sm:px-6 lg:px-8 lg:pb-8">
            <div className="grid gap-4 xl:grid-cols-2">
              {currentBudgets.length === 0 ? (
                <div className="card-surface col-span-full flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                    <Target className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    No {activeTab} budgets
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeTab === "active"
                      ? "Create your first budget to get started"
                      : `No ${activeTab} budgets found`}
                  </p>
                  {activeTab === "active" && (
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      Create budget
                    </Button>
                  )}
                </div>
              ) : (
                currentBudgets?.map((budget: BudgetWithRelations) => {
                  const budgetStatus = getBudgetStatus(budget);
                  const categorySummary = getCategorySummary(budget);
                  const totalBudgetIncome = calculateTotalIncome(budget);
                  const totalBudgetSpent = calculateBudgetSpent(budget);
                  const budgetRemaining = totalBudgetIncome - totalBudgetSpent;
                  const spendingPercentage = calculateSpendingPercentage(
                    totalBudgetSpent,
                    totalBudgetIncome,
                  );

                  // Calculate days remaining in budget period
                  const now = new Date();
                  const endDate = new Date(budget.endAt);
                  const daysRemaining = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  const isOverdue = daysRemaining < 0;

                  const statusChip =
                    activeTab === "completed"
                      ? {
                          label: "Completed",
                          chip: "bg-green-50 text-green-700",
                        }
                      : activeTab === "archived"
                        ? {
                            label: "Archived",
                            chip: "bg-gray-100 text-gray-600",
                          }
                        : {
                            label: budgetStatus.label,
                            chip: budgetStatus.chip,
                          };

                  return (
                    <div
                      key={budget.id}
                      className="card-interactive cursor-pointer p-5 sm:p-6"
                      onClick={() => router.push(`/budgets/${budget.id}`)}
                    >
                      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
                              {budget.name}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChip.chip}`}
                            >
                              {statusChip.label}
                            </span>
                            {/* Action Icons */}
                            <div className="ml-auto flex items-center gap-0.5">
                              {activeTab === "active" && (
                                <>
                                  <button
                                    onClick={async (e: MouseEvent) => {
                                      e.stopPropagation();
                                      await handleMarkCompleted(budget);
                                    }}
                                    className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-green-50 hover:text-green-600"
                                    title="Mark as completed"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={async (e: MouseEvent) => {
                                      e.stopPropagation();
                                      await handleMarkArchived(budget);
                                    }}
                                    className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-secondary-50 hover:text-secondary-700"
                                    title="Archive"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {(activeTab === "completed" ||
                                activeTab === "archived") && (
                                <button
                                  onClick={async (e: MouseEvent) => {
                                    e.stopPropagation();
                                    await handleReactivate(budget);
                                  }}
                                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-secondary-50 hover:text-secondary-700"
                                  title="Reactivate"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  handleDuplicateBudget(budget);
                                }}
                                className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700"
                                title="Duplicate"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  handleDeleteBudget(budget);
                                }}
                                className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4 sm:text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="capitalize">
                                {budget.period.replace("_", " ").toLowerCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-3.5 w-3.5" />
                              <span className="capitalize">
                                {budget.strategy
                                  .replace("_", " ")
                                  .toLowerCase()}
                              </span>
                            </div>
                            {activeTab === "active" && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span
                                  className={
                                    isOverdue ? "font-medium text-red-600" : ""
                                  }
                                >
                                  {isOverdue
                                    ? `${Math.abs(daysRemaining)} days overdue`
                                    : `${daysRemaining} days left`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-2xl">
                            ${totalBudgetIncome.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total budget
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">
                            Progress
                          </span>
                          <span className="text-xs font-medium tabular-nums text-gray-500">
                            {spendingPercentage.toFixed(1)}% used
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ease-out ${
                              spendingPercentage === 100
                                ? "bg-green-500"
                                : spendingPercentage > 100
                                  ? "bg-red-500"
                                  : "bg-secondary"
                            }`}
                            style={{
                              width: `${Math.min(spendingPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Budget Summary */}
                      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-surface px-2 py-3 text-center">
                        <div>
                          <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                            ${totalBudgetSpent.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Spent</div>
                        </div>
                        <div>
                          <div
                            className={`text-base font-bold tabular-nums tracking-tight sm:text-lg ${
                              budgetRemaining >= 0
                                ? "text-gray-900"
                                : "text-red-600"
                            }`}
                          >
                            ${Math.abs(budgetRemaining).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {budgetRemaining >= 0 ? "Remaining" : "Over budget"}
                          </div>
                        </div>
                        <div>
                          <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                            {categorySummary.needs +
                              categorySummary.wants +
                              categorySummary.investments}
                          </div>
                          <div className="text-xs text-gray-500">
                            Categories
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setBudgetToDuplicate(null);
        }}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setBudgetToDuplicate(null);
          toast.success("Budget created successfully!");
        }}
        initialBudget={budgetToDuplicate}
      />

      <DeleteConfirmationModal
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={async () => {
          if (budgetToDelete) {
            try {
              await deleteBudgetMutation.mutateAsync(budgetToDelete.id);
              toast.success("Budget deleted successfully!");
              setBudgetToDelete(null);
            } catch (err) {
              toast.error("Failed to delete budget. Please try again.");
              console.error("Failed to delete budget:", err);
            }
          }
        }}
        title="Delete Budget"
        message={`Are you sure you want to delete "${budgetToDelete?.name}"? This action cannot be undone.`}
        itemName={budgetToDelete?.name ?? ""}
      />
    </div>
  );
};

export default BudgetsPage;
