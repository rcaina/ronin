"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  EditIcon,
  Pencil,
  Info,
  Plus,
  Trash2,
  ScanLine,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { usePageLoading } from "@/components/ConditionalLayout";
import { useMobileHeaderAction } from "@/components/MobileHeaderActionContext";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import ReceiptScanModal from "@/components/transactions/ReceiptScanModal";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import InlineTransactionEdit from "@/components/transactions/InlineTransactionEdit";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import SwipeableRow from "@/components/SwipeableRow";
import { useState, useEffect } from "react";
import EditBudgetModal from "@/components/budgets/EditBudgetModal";
import BudgetStrategyIndicator from "@/components/budgets/BudgetStrategyIndicator";
import { TransactionType, type Transaction } from "@prisma/client";
import { formatDateUTC, roundToCents, getGroupColor } from "@/lib/utils";
import { isDebitCard } from "@/lib/utils/cards";
import { calculateCategorySpent } from "@/lib/utils/spending";
import { useDeleteTransaction } from "@/lib/data-hooks/transactions/useTransactions";
import type {
  TransactionSplitWithCategory,
  TransactionWithRelations,
} from "@/lib/types/transaction";
import {
  SPLIT_BADGE_CLASSES,
  getSplitBadgeLabel,
} from "@/lib/utils/transactions";
import { useBudgetDetailStats } from "@/lib/data-hooks/budgets/useBudgetStats";
import { useBudgetHeader } from "../../../../components/budgets/BudgetHeaderContext";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  CHART_COLORS,
  GROUP_COLORS,
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

// Themed chip classes for category groups (matches GROUP_COLORS in the chart theme).
const getGroupChipClasses = (group?: string) => {
  switch (String(group ?? "").toUpperCase()) {
    case "NEEDS":
      return "bg-[#5b7a9d]/10 text-[#5b7a9d]";
    case "WANTS":
      return "bg-secondary-100 text-secondary-800";
    case "INVESTMENT":
      return "bg-[#6c9a8b]/10 text-[#6c9a8b]";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const getGroupDotColor = (group?: string) =>
  GROUP_COLORS[String(group ?? "").toUpperCase()] ?? "#9ca3af";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isReceiptScanOpen, setIsReceiptScanOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isCardPaymentOpen, setIsCardPaymentOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingSplitTransaction, setEditingSplitTransaction] =
    useState<TransactionWithRelations | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionWithRelations | null>(null);
  const { data: budget, isLoading, error } = useBudget(id as string, true); // Exclude card payments for calculations
  const { setActions } = useBudgetHeader();
  const { setMobileHeaderAction } = useMobileHeaderAction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Register header actions
  useEffect(() => {
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add transaction",
        onClick: () => setIsAddTransactionOpen(true),
        variant: "primary" as const,
      },
      {
        icon: <ScanLine className="h-4 w-4" />,
        label: "Scan receipt",
        onClick: () => setIsReceiptScanOpen(true),
        variant: "outline" as const,
      },
      {
        icon: <DollarSign className="h-4 w-4" />,
        label: "Pay credit card",
        onClick: () => setIsCardPaymentOpen(true),
        variant: "secondary" as const,
      },
    ]);
  }, [setActions]);

  // Register the mobile header's scan-receipt shortcut; clean up on unmount
  // so it doesn't leak into other pages.
  useEffect(() => {
    setMobileHeaderAction({
      icon: <ScanLine className="h-5 w-5" />,
      label: "Scan receipt",
      onClick: () => setIsReceiptScanOpen(true),
    });
    return () => setMobileHeaderAction(null);
  }, [setMobileHeaderAction]);

  // Per-budget statistics (totals + chart data), computed from shared utils
  const {
    totalIncome,
    totalSpent,
    totalRemaining,
    spendingPercentage,
    categorySpendingData,
    dailySpendingData,
    categoryUsageData,
  } = useBudgetDetailStats(budget);

  usePageLoading(isLoading, "Loading budget...");
  if (isLoading) {
    return (
      <div className="flex flex-col bg-surface lg:h-full lg:flex-col">
        <div className="mx-auto flex w-full flex-col px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:flex-1 lg:overflow-hidden lg:px-8 lg:py-4 lg:pb-8">
          {/* Charts row skeleton */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-3 lg:grid-cols-4 lg:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card-surface p-4">
                <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
              </div>
            ))}
          </div>

          {/* Category group cards skeleton */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-3 sm:gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-surface-muted"
              />
            ))}
          </div>

          {/* Recent transactions skeleton */}
          <div className="card-surface flex-1 p-3 sm:p-4">
            <div className="mb-4 h-5 w-48 animate-pulse rounded-full bg-surface-muted" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-surface-muted"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <TrendingDown className="mx-auto h-12 w-12" strokeWidth={1.5} />
          </div>
          <div className="mb-2 text-lg text-red-600">Error loading budget</div>
          <div className="text-sm text-gray-500">{error.message}</div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
            <Target className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Budget not found
          </div>
        </div>
      </div>
    );
  }

  // Get budget status display
  const getBudgetStatusDisplay = () => {
    switch (budget.status) {
      case "ACTIVE":
        return {
          status: "Active",
          color: "text-secondary-700",
          bg: "bg-secondary-100",
          subtitle: "Budget is active",
        };
      case "COMPLETED":
        return {
          status: "Completed",
          color: "text-green-600",
          bg: "bg-green-50",
          subtitle: "Budget period finished",
        };
      case "ARCHIVED":
        return {
          status: "Archived",
          color: "text-gray-600",
          bg: "bg-gray-100",
          subtitle: "Budget is archived",
        };
      default:
        return {
          status: "Unknown",
          color: "text-gray-600",
          bg: "bg-gray-100",
          subtitle: "Status unknown",
        };
    }
  };

  const budgetStatusDisplay = getBudgetStatusDisplay();

  // Group categories by type and sort by usage percentage
  const categoriesByGroup = (budget.categories ?? []).reduce(
    (acc, budgetCategory) => {
      const group = budgetCategory.group.toLowerCase();
      acc[group] ??= [];
      acc[group].push(budgetCategory);
      return acc;
    },
    {} as Record<string, typeof budget.categories>,
  );

  // Sort categories within each group by usage percentage (100% used at bottom)
  Object.keys(categoriesByGroup).forEach((group) => {
    const categories = categoriesByGroup[group];
    if (categories) {
      categories.sort((a, b) => {
        const aSpent = calculateCategorySpent(a);
        const bSpent = calculateCategorySpent(b);

        const aPercentage =
          a.allocatedAmount && a.allocatedAmount > 0
            ? (aSpent / a.allocatedAmount) * 100
            : 0;
        const bPercentage =
          b.allocatedAmount && b.allocatedAmount > 0
            ? (bSpent / b.allocatedAmount) * 100
            : 0;

        // Sort by percentage ascending (100% used categories at bottom)
        return aPercentage - bPercentage;
      });
    }
  });

  const getGroupLabel = (group: string) => {
    switch (group) {
      case "needs":
        return "Needs";
      case "wants":
        return "Wants";
      case "investment":
        return "Investment";
      default:
        return group;
    }
  };

  const handleEditTransaction = (transaction: TransactionWithRelations) => {
    // Card payment transactions cannot be edited inline
    if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
      toast.error(
        "Card payment transactions cannot be edited. Please delete and recreate if needed.",
      );
      return;
    }
    // Split transactions aren't safe to edit inline (it could corrupt the
    // per-category breakdown) — route to the full form modal instead.
    if (transaction.splits && transaction.splits.length > 0) {
      setEditingSplitTransaction(transaction);
      return;
    }
    setEditingTransactionId(transaction.id);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      await deleteTransactionMutation.mutateAsync({
        id: transactionToDelete.id,
        budgetId: transactionToDelete.budgetId,
      });
      setTransactionToDelete(null);
      toast.success("Transaction deleted successfully!");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      toast.error("Failed to delete transaction. Please try again.");
    }
  };

  return (
    <>
      <div className="flex flex-col bg-surface lg:h-full lg:flex-col">
        <div className="mx-auto flex w-full flex-col px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:flex-1 lg:overflow-hidden lg:px-8 lg:py-4 lg:pb-8">
          {/* Budget Overview Graphs — swipeable row on mobile, grid on larger screens */}
          <div className="scrollbar-hide mb-4 flex flex-shrink-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:mb-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-4">
            {/* Budget Progress Circular Progress Bar */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Budget progress
              </h3>
              {totalIncome > 0 ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative" style={{ width: 120, height: 120 }}>
                    <svg
                      className="-rotate-90 transform"
                      width="120"
                      height="120"
                    >
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth="8"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={
                          spendingPercentage > 100
                            ? "#dc2626"
                            : spendingPercentage === 100
                              ? "#16a34a"
                              : CHART_COLORS[0]
                        }
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${
                          2 *
                          Math.PI *
                          50 *
                          (1 - Math.min(spendingPercentage, 100) / 100)
                        }`}
                        style={{
                          transition: "stroke-dashoffset 0.5s ease-out",
                        }}
                      />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                        {spendingPercentage.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-500 sm:text-xs">
                        Used
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <ChartEmptyState
                  icon={Target}
                  message="No data yet"
                  height={140}
                />
              )}
            </div>

            {/* Category Spending Donut Chart */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Category spending
              </h3>
              {categorySpendingData.length > 0 ? (
                <>
                  <ChartContainer height={140}>
                    <PieChart>
                      <Pie
                        data={categorySpendingData}
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
                        {categorySpendingData.map((entry, index) => (
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
                          const total = categorySpendingData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          );
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
                  <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[10px]">
                    {categorySpendingData.slice(0, 3).map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-500">
                          {item.name.length > 8
                            ? item.name.substring(0, 8) + "..."
                            : item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <ChartEmptyState
                  icon={Target}
                  message="No spending yet"
                  height={140}
                />
              )}
            </div>

            {/* Daily Spending Trend */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Avg daily spending
              </h3>
              {dailySpendingData.length > 0 &&
              dailySpendingData.some((d) => d.spending > 0) ? (
                <ChartContainer height={140}>
                  <AreaChart data={dailySpendingData}>
                    <defs>
                      <linearGradient
                        id="budgetDetailDailyFill"
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
                      width={38}
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
                          date ? `Avg (${date})` : "Avg spending",
                        ];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spending"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      fill="url(#budgetDetailDailyFill)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState
                  icon={TrendingUp}
                  message="No spending data"
                  height={140}
                />
              )}
            </div>

            {/* Category Usage Bar Chart */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Top categories
              </h3>
              {categoryUsageData.length > 0 ? (
                <ChartContainer height={140}>
                  <BarChart data={categoryUsageData}>
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      height={40}
                      {...chartAxisProps}
                      fontSize={8}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        typeof value === "number"
                          ? formatCompactCurrency(value)
                          : ""
                      }
                      {...chartAxisProps}
                      fontSize={8}
                      width={38}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(185, 161, 94, 0.08)" }}
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                      formatter={(
                        value: number | undefined,
                        name?: string,
                        payload?: unknown,
                      ) => {
                        if (value === undefined) return "";
                        const payloadData = payload as
                          | {
                              fullName?: string;
                              allocated?: number;
                              spent?: number;
                            }
                          | undefined;
                        return [
                          `$${value.toLocaleString()}`,
                          payloadData?.fullName ?? name ?? "Category",
                        ];
                      }}
                    />
                    <Bar
                      dataKey="remaining"
                      stackId="a"
                      fill="#efeeeb"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      stackId="a"
                      fill={CHART_COLORS[0]}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState
                  icon={Target}
                  message="No categories"
                  height={140}
                />
              )}
            </div>
          </div>

          {/* Budget Details, Categories Summary, and Budget Summary - Three Columns */}
          <div className="mb-4 grid flex-shrink-0 grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-2 sm:gap-4 lg:mb-4 lg:grid-cols-3">
            {/* Budget Details */}
            <div className="card-surface p-3 sm:p-4">
              <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                <h3 className="text-xs font-semibold tracking-tight text-gray-900 sm:text-sm lg:text-base">
                  Budget details
                </h3>
                <button
                  onClick={() => setIsEditBudgetOpen(true)}
                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
                  title="Edit budget details"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Strategy
                  </span>
                  <p className="text-xs font-medium capitalize sm:text-sm">
                    {budget.strategy.replace("_", " ").toLowerCase()}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Period
                  </span>
                  <p className="text-xs font-medium capitalize sm:text-sm">
                    {budget.period.replace("_", " ").toLowerCase()}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Start date
                  </span>
                  <p className="text-xs font-medium tabular-nums sm:text-sm">
                    {formatDateUTC(new Date(budget.startAt).toISOString())}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    End date
                  </span>
                  <p className="text-xs font-medium tabular-nums sm:text-sm">
                    {formatDateUTC(new Date(budget.endAt).toISOString())}
                  </p>
                </div>
              </div>
            </div>

            {/* Categories Summary */}
            <div className="card-surface p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-tight text-gray-900 sm:text-sm lg:text-base">
                  Categories summary
                </h3>
                <button
                  onClick={() =>
                    router.push(`/budgets/${String(id)}/categories`)
                  }
                  className="text-[10px] font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800 sm:text-xs"
                >
                  View details
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(categoriesByGroup)
                  .filter(([group]) => group !== "card_payment")
                  .map(([group, categories]) => {
                    if (!categories || categories.length === 0) return null;

                    // Calculate totals for this group
                    const totalAllocated = roundToCents(
                      categories.reduce(
                        (sum, cat) => sum + (cat.allocatedAmount ?? 0),
                        0,
                      ),
                    );

                    const totalSpent = roundToCents(
                      categories.reduce(
                        (sum, cat) =>
                          sum + roundToCents(calculateCategorySpent(cat)),
                        0,
                      ),
                    );

                    const usagePercentage = roundToCents(
                      totalAllocated > 0
                        ? (totalSpent / totalAllocated) * 100
                        : 0,
                    );

                    // Count categories that are 100% used
                    const fullyUsedCount = categories.filter((cat) => {
                      const categorySpent = roundToCents(
                        calculateCategorySpent(cat),
                      );
                      const categoryPercentage = roundToCents(
                        cat.allocatedAmount && cat.allocatedAmount > 0
                          ? (categorySpent / cat.allocatedAmount) * 100
                          : 0,
                      );
                      return categoryPercentage >= 100;
                    }).length;

                    return (
                      <div key={group} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: getGroupDotColor(group),
                              }}
                            ></div>
                            <span className="text-xs font-medium text-gray-900">
                              {getGroupLabel(group)}
                            </span>
                            <span className="text-[10px] tabular-nums text-gray-500">
                              ({fullyUsedCount}/{categories.length})
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium tabular-nums text-gray-900">
                              ${totalSpent.toLocaleString()} / $
                              {totalAllocated.toLocaleString()}
                            </div>
                            <div className="text-[10px] tabular-nums text-gray-500">
                              {usagePercentage.toFixed(1)}% used
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                              usagePercentage === 100
                                ? "bg-green-500"
                                : usagePercentage > 100
                                  ? "bg-red-500"
                                  : "bg-secondary"
                            }`}
                            style={{
                              width: `${usagePercentage > 100 ? 100 : usagePercentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="card-surface p-3 sm:p-4">
              <h3 className="mb-2 text-xs font-semibold tracking-tight text-gray-900 sm:text-sm lg:text-base">
                Budget summary
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                    <span className="text-xs font-medium text-gray-500">
                      Total income
                    </span>
                  </div>
                  <div className="text-sm font-bold tabular-nums tracking-tight text-gray-900 sm:text-base">
                    ${totalIncome.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {(() => {
                      const debitCards = (budget.cards ?? []).filter(
                        isDebitCard,
                      );
                      const debitCardIds = debitCards.map(
                        (card: { id: string }) => card.id,
                      );
                      const incomeTransactions = (
                        budget.transactions ?? []
                      ).filter(
                        (transaction) =>
                          transaction.transactionType ===
                            TransactionType.INCOME &&
                          transaction.cardId &&
                          debitCardIds.includes(transaction.cardId),
                      );
                      return incomeTransactions.length === 1
                        ? (incomeTransactions[0]?.name ?? "Income")
                        : `${incomeTransactions.length} income transactions`;
                    })()}
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <TrendingDown className="h-3 w-3 text-red-500 sm:h-4 sm:w-4" />
                    <span className="text-xs font-medium text-gray-500">
                      Total spent
                    </span>
                  </div>
                  <div className="text-sm font-bold tabular-nums tracking-tight text-gray-900 sm:text-base">
                    ${totalSpent.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[9px] tabular-nums text-gray-400 sm:text-[10px]">
                    {spendingPercentage.toFixed(1)}% of budget
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-secondary-600 sm:h-4 sm:w-4" />
                    <span className="text-xs font-medium text-gray-500">
                      Remaining
                    </span>
                  </div>
                  <div
                    className={`text-sm font-bold tabular-nums tracking-tight sm:text-base ${
                      totalRemaining >= 0 ? "text-gray-900" : "text-red-600"
                    }`}
                  >
                    ${totalRemaining.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {totalRemaining >= 0 ? "Available" : "Over budget"}
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <div
                      className={`h-3 w-3 rounded-full ${budgetStatusDisplay.bg} sm:h-4 sm:w-4`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${budgetStatusDisplay.color.replace("text-", "bg-")} m-0.5 sm:m-0.5 sm:h-2 sm:w-2`}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      Status
                    </span>
                  </div>
                  <div
                    className={`text-sm font-bold tracking-tight sm:text-base ${budgetStatusDisplay.color}`}
                  >
                    {budgetStatusDisplay.status}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {budgetStatusDisplay.subtitle}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy adherence — live indicator for the budget's strategy */}
          <BudgetStrategyIndicator budget={budget} totalIncome={totalIncome} />

          {/* Recent Transactions Summary */}
          <div className="card-surface mb-4 flex min-h-0 flex-1 flex-col p-3 sm:mb-4 sm:p-4">
            <div className="mb-3 flex flex-shrink-0 items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-gray-900 sm:text-base lg:text-lg">
                Recent transactions
              </h3>
              <button
                onClick={() =>
                  router.push(`/budgets/${String(id)}/transactions`)
                }
                className="text-xs font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800 sm:text-sm"
              >
                View all
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {(() => {
                // Collect all transactions from all categories
                const categoryTransactions = (budget.categories ?? []).flatMap(
                  (cat) =>
                    (cat.transactions ?? []).map((transaction) => ({
                      ...transaction,
                      // Attach the parent category so the row can be reused as a
                      // TransactionWithRelations for copy/edit/delete actions.
                      category: cat,
                      categoryName: cat.name,
                      categoryGroup: cat.group,
                      splits: undefined as
                        | TransactionSplitWithCategory[]
                        | undefined,
                    })),
                );

                // Split parents have categoryId=null, so they never show up in
                // any category's `transactions` list above — they only appear
                // in `transactionSplits` (once per category they're split
                // across). Surface each split parent exactly once, with its
                // full split breakdown reconstructed from every category that
                // references it.
                const splitEntriesByTransactionId = new Map<
                  string,
                  TransactionSplitWithCategory[]
                >();
                const splitParentsById = new Map<string, Transaction>();
                (budget.categories ?? []).forEach((cat) => {
                  (cat.transactionSplits ?? []).forEach((split) => {
                    const entries =
                      splitEntriesByTransactionId.get(split.transactionId) ??
                      [];
                    entries.push({
                      id: split.id,
                      transactionId: split.transactionId,
                      categoryId: split.categoryId,
                      amount: split.amount,
                      note: split.note,
                      category: cat,
                    });
                    splitEntriesByTransactionId.set(
                      split.transactionId,
                      entries,
                    );
                    splitParentsById.set(
                      split.transactionId,
                      split.transaction,
                    );
                  });
                });

                const splitParentTransactions = Array.from(
                  splitEntriesByTransactionId.entries(),
                ).map(([transactionId, splits]) => {
                  const parent = splitParentsById.get(transactionId)!;
                  return {
                    ...parent,
                    category: null,
                    categoryName: undefined as string | undefined,
                    categoryGroup: undefined as string | undefined,
                    splits,
                    id: transactionId,
                  };
                });

                const allTransactions = [
                  ...categoryTransactions,
                  ...splitParentTransactions,
                ];

                if (allTransactions.length === 0) {
                  return (
                    <div className="py-6 text-center">
                      <p className="text-sm text-gray-500">
                        No transactions yet — add your first one.
                      </p>
                      <button
                        onClick={() => setIsAddTransactionOpen(true)}
                        className="mt-2 text-xs font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
                      >
                        Add your first transaction
                      </button>
                    </div>
                  );
                }

                // Sort by date and take the 5 most recent
                const recentTransactions = [...allTransactions]
                  .sort((a, b) => {
                    const dateA = a.occurredAt
                      ? new Date(a.occurredAt)
                      : new Date(a.createdAt);
                    const dateB = b.occurredAt
                      ? new Date(b.occurredAt)
                      : new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 5);

                return recentTransactions.map((transaction) => {
                  const isEditing = editingTransactionId === transaction.id;

                  if (isEditing) {
                    return (
                      <div
                        key={transaction.id}
                        className="overflow-hidden rounded-xl border border-secondary-200"
                      >
                        <InlineTransactionEdit
                          transaction={transaction}
                          onCancel={() => setEditingTransactionId(null)}
                          onSuccess={() => setEditingTransactionId(null)}
                          getGroupColor={getGroupColor}
                        />
                      </div>
                    );
                  }

                  return (
                    <SwipeableRow
                      key={transaction.id}
                      disabled={isEditing}
                      className="rounded-xl"
                      actions={[
                        {
                          icon: <Pencil className="h-4 w-4" />,
                          label: "Edit",
                          onClick: () => handleEditTransaction(transaction),
                        },
                        {
                          icon: <Trash2 className="h-4 w-4" />,
                          label: "Delete",
                          onClick: () => setTransactionToDelete(transaction),
                          tone: "danger",
                        },
                      ]}
                    >
                      <div className="group/row flex items-center justify-between rounded-xl border border-gray-100 bg-surface p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {transaction.name ?? "Unnamed transaction"}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                transaction.transactionType ===
                                TransactionType.CARD_PAYMENT
                                  ? "bg-gray-100 text-gray-500"
                                  : transaction.splits &&
                                      transaction.splits.length > 0
                                    ? SPLIT_BADGE_CLASSES
                                    : getGroupChipClasses(
                                        transaction.categoryName
                                          ? transaction.categoryGroup
                                          : undefined,
                                      )
                              }`}
                            >
                              {transaction.transactionType ===
                              TransactionType.CARD_PAYMENT
                                ? "Card payment"
                                : transaction.splits &&
                                    transaction.splits.length > 0
                                  ? getSplitBadgeLabel(
                                      transaction.splits.length,
                                    )
                                  : (transaction.categoryName ?? "No category")}
                            </span>
                            {transaction.description && (
                              <div className="group relative flex-shrink-0">
                                <Info className="h-4 w-4 cursor-help text-gray-400" />
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-xl bg-primary-950/90 px-3 py-2 text-sm text-white opacity-0 shadow-lifted transition-opacity duration-200 group-hover:opacity-100">
                                  {transaction.description}
                                  <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-950/90"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {transaction.occurredAt
                              ? formatDateUTC(
                                  new Date(
                                    transaction.occurredAt,
                                  ).toISOString(),
                                )
                              : formatDateUTC(
                                  new Date(transaction.createdAt).toISOString(),
                                )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {/* Action icons — desktop hover only; mobile exposes
                            these via swipe (SwipeableRow). */}
                          <div className="hidden items-center space-x-1 opacity-0 transition-opacity lg:flex lg:group-hover/row:opacity-100">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                              title="Edit transaction"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                setTransactionToDelete(transaction)
                              }
                              className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-semibold tabular-nums ${
                                transaction.transactionType ===
                                TransactionType.RETURN
                                  ? "text-green-600"
                                  : ""
                              }`}
                            >
                              {transaction.transactionType ===
                              TransactionType.RETURN
                                ? "+"
                                : ""}
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </div>
                            <div className="text-xs capitalize text-gray-500">
                              {transaction.transactionType
                                .toLowerCase()
                                .replace("_", " ")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwipeableRow>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {isAddTransactionOpen && id && (
        <AddTransactionModal
          isOpen={isAddTransactionOpen}
          budgetId={id as string}
          onClose={() => setIsAddTransactionOpen(false)}
        />
      )}
      {/* Edit Split Transaction Modal — split transactions route here
          instead of the inline editor (see handleEditTransaction). */}
      {editingSplitTransaction && id && (
        <AddTransactionModal
          isOpen={!!editingSplitTransaction}
          transaction={editingSplitTransaction}
          budgetId={id as string}
          onClose={() => setEditingSplitTransaction(null)}
          onSuccess={() => setEditingSplitTransaction(null)}
        />
      )}
      {isReceiptScanOpen && id && (
        <ReceiptScanModal
          isOpen={isReceiptScanOpen}
          budgetId={id as string}
          onClose={() => setIsReceiptScanOpen(false)}
        />
      )}
      {isEditBudgetOpen && (
        <EditBudgetModal
          isOpen={isEditBudgetOpen}
          budget={budget}
          onClose={() => setIsEditBudgetOpen(false)}
        />
      )}
      {isCardPaymentOpen && (
        <CardPaymentModal
          isOpen={isCardPaymentOpen}
          onClose={() => setIsCardPaymentOpen(false)}
          budgetId={id as string}
        />
      )}

      <DeleteConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message={
          transactionToDelete?.splits && transactionToDelete.splits.length > 0
            ? `This will delete the transaction '{itemName}' and its ${transactionToDelete.splits.length} category splits. This action cannot be undone.`
            : "Are you sure you want to delete the transaction '{itemName}'? This action cannot be undone."
        }
        itemName={transactionToDelete?.name ?? "Unnamed transaction"}
        isLoading={deleteTransactionMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete Transaction"
        cancelText="Cancel"
      />
    </>
  );
};

export default BudgetDetailsPage;
