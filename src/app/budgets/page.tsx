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
import { CategoryType, TransactionType, CardType } from "@prisma/client";
import Button from "@/components/Button";
import { roundToCents } from "@/lib/utils";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type TabType = "active" | "completed" | "archived";

// Helper function to calculate total income from INCOME transactions on debit cards
const calculateTotalIncome = (budget: BudgetWithRelations): number => {
  // Get all debit cards for this budget
  const debitCards = (budget.cards ?? []).filter(
    (card: { cardType: string }) =>
      card.cardType === CardType.DEBIT ||
      card.cardType === CardType.BUSINESS_DEBIT,
  );
  const debitCardIds = debitCards.map((card: { id: string }) => card.id);

  // Sum all INCOME transactions on debit cards
  return (budget.transactions ?? []).reduce((sum, transaction) => {
    if (
      transaction.transactionType === TransactionType.INCOME &&
      transaction.cardId &&
      debitCardIds.includes(transaction.cardId)
    ) {
      return sum + transaction.amount;
    }
    return sum;
  }, 0);
};

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

  // Enhanced budget statistics with more sophisticated calculations
  const budgetStats = useMemo(() => {
    const totalBudgets =
      activeBudgets.length + completedBudgets.length + archivedBudgets.length;
    const activeBudgetsCount = activeBudgets.length;

    // Calculate total income and spending for active budgets only
    const totalIncome = activeBudgets.reduce((sum, budget) => {
      return sum + calculateTotalIncome(budget);
    }, 0);

    const totalSpent = activeBudgets.reduce((sum, budget) => {
      return (
        sum +
        (budget.categories ?? []).reduce((categorySum, category) => {
          return (
            categorySum +
            (category.transactions ?? []).reduce(
              (transactionSum, transaction) => {
                // Exclude INCOME and CARD_PAYMENT transactions from spending
                if (
                  transaction.transactionType === TransactionType.INCOME ||
                  transaction.transactionType === TransactionType.CARD_PAYMENT
                ) {
                  return transactionSum;
                }
                if (transaction.transactionType === TransactionType.RETURN) {
                  // Returns reduce spending (positive amount = refund received)
                  return transactionSum - transaction.amount;
                } else {
                  // Regular transactions: positive = purchases (increase spending)
                  return transactionSum + transaction.amount;
                }
              },
              0,
            )
          );
        }, 0)
      );
    }, 0);

    const totalRemaining = totalIncome - totalSpent;
    const overallSpendingPercentage =
      totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

    // Calculate spending by category group for active budgets
    const spendingByGroup = activeBudgets.reduce(
      (acc, budget) => {
        (budget.categories ?? []).forEach((category) => {
          const group = category.group ?? CategoryType.NEEDS;
          const spent = (category.transactions ?? []).reduce(
            (sum, transaction) => {
              // Exclude INCOME and CARD_PAYMENT transactions from spending
              if (
                transaction.transactionType === TransactionType.INCOME ||
                transaction.transactionType === TransactionType.CARD_PAYMENT
              ) {
                return sum;
              }
              if (transaction.transactionType === TransactionType.RETURN) {
                // Returns reduce spending (positive amount = refund received)
                return sum - transaction.amount;
              } else {
                // Regular transactions: positive = purchases (increase spending)
                return sum + transaction.amount;
              }
            },
            0,
          );
          acc[group] = (acc[group] ?? 0) + spent;
        });
        return acc;
      },
      {} as Record<CategoryType, number>,
    );

    // Prepare pie chart data for category groups
    const pieChartData = [
      {
        name: "Needs",
        value: roundToCents(spendingByGroup[CategoryType.NEEDS] ?? 0),
        color: "#3b82f6", // blue-500
      },
      {
        name: "Wants",
        value: roundToCents(spendingByGroup[CategoryType.WANTS] ?? 0),
        color: "#a855f7", // purple-500
      },
      {
        name: "Investment",
        value: roundToCents(spendingByGroup[CategoryType.INVESTMENT] ?? 0),
        color: "#10b981", // green-500
      },
    ].filter((item) => item.value > 0);

    // Calculate top spending categories across all active budgets
    const categorySpending = activeBudgets.reduce(
      (acc, budget) => {
        (budget.categories ?? []).forEach((category) => {
          const spent = (category.transactions ?? []).reduce(
            (sum, transaction) => {
              if (
                transaction.transactionType === TransactionType.INCOME ||
                transaction.transactionType === TransactionType.CARD_PAYMENT
              ) {
                return sum;
              }
              if (transaction.transactionType === TransactionType.RETURN) {
                return sum - transaction.amount;
              } else {
                return sum + transaction.amount;
              }
            },
            0,
          );
          if (spent > 0) {
            const existing = acc.find((item) => item.name === category.name);
            if (existing) {
              existing.value += spent;
            } else {
              acc.push({
                name: category.name,
                value: roundToCents(spent),
                group: category.group,
              });
            }
          }
        });
        return acc;
      },
      [] as Array<{ name: string; value: number; group: CategoryType }>,
    );

    // Sort and get top 5 categories
    const topCategoriesData = categorySpending
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({
        name:
          item.name.length > 15
            ? item.name.substring(0, 15) + "..."
            : item.name,
        value: item.value,
        fullName: item.name,
      }));

    // Calculate recent spending (last 7 days) for active budgets
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSpending = activeBudgets.reduce((sum, budget) => {
      return (
        sum +
        (budget.categories ?? []).reduce((categorySum, category) => {
          return (
            categorySum +
            (category.transactions ?? []).reduce(
              (transactionSum, transaction) => {
                const transactionDate = new Date(transaction.createdAt);
                if (transactionDate >= sevenDaysAgo) {
                  // Exclude INCOME and CARD_PAYMENT transactions from spending
                  if (
                    transaction.transactionType === TransactionType.INCOME ||
                    transaction.transactionType === TransactionType.CARD_PAYMENT
                  ) {
                    return transactionSum;
                  }
                  if (transaction.transactionType === TransactionType.RETURN) {
                    // Returns reduce spending (positive amount = refund received)
                    return transactionSum - transaction.amount;
                  } else {
                    // Regular transactions: positive = purchases (increase spending)
                    return transactionSum + transaction.amount;
                  }
                }
                return transactionSum;
              },
              0,
            )
          );
        }, 0)
      );
    }, 0);

    // Calculate average daily spending for active budgets
    const averageDailySpending = recentSpending / 7;

    // Calculate daily spending for the last 7 days
    const dailySpendingData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySpending = activeBudgets.reduce((sum, budget) => {
        return (
          sum +
          (budget.categories ?? []).reduce((categorySum, category) => {
            return (
              categorySum +
              (category.transactions ?? []).reduce(
                (transactionSum, transaction) => {
                  const transactionDate = new Date(transaction.createdAt);
                  if (transactionDate >= date && transactionDate < nextDate) {
                    // Exclude INCOME and CARD_PAYMENT transactions from spending
                    if (
                      transaction.transactionType === TransactionType.INCOME ||
                      transaction.transactionType ===
                        TransactionType.CARD_PAYMENT
                    ) {
                      return transactionSum;
                    }
                    if (
                      transaction.transactionType === TransactionType.RETURN
                    ) {
                      // Returns reduce spending (positive amount = refund received)
                      return transactionSum - transaction.amount;
                    } else {
                      // Regular transactions: positive = purchases (increase spending)
                      return transactionSum + transaction.amount;
                    }
                  }
                  return transactionSum;
                },
                0,
              )
            );
          }, 0)
        );
      }, 0);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      dailySpendingData.push({
        day: dayName,
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        spending: roundToCents(daySpending),
      });
    }

    return {
      totalBudgets,
      activeBudgetsCount,
      totalIncome,
      totalSpent,
      totalRemaining,
      overallSpendingPercentage,
      spendingByGroup,
      recentSpending,
      averageDailySpending,
      pieChartData,
      topCategoriesData,
      dailySpendingData,
    };
  }, [activeBudgets, completedBudgets, archivedBudgets]);

  if (isLoading) {
    return <LoadingSpinner message="Loading budgets..." />;
  }

  const getBudgetStatus = (budget: BudgetWithRelations) => {
    const totalBudgetIncome = calculateTotalIncome(budget);
    const totalBudgetSpent = roundToCents(
      (budget.categories ?? []).reduce((sum: number, category) => {
        return (
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum: number, transaction) => {
              // Exclude INCOME and CARD_PAYMENT transactions from spending
              if (
                transaction.transactionType === TransactionType.INCOME ||
                transaction.transactionType === TransactionType.CARD_PAYMENT
              ) {
                return transactionSum;
              }
              if (transaction.transactionType === TransactionType.RETURN) {
                // Returns reduce spending (positive amount = refund received)
                return transactionSum - transaction.amount;
              } else {
                // Regular transactions: positive = purchases (increase spending)
                return transactionSum + transaction.amount;
              }
            },
            0,
          )
        );
      }, 0),
    );

    const percentage = roundToCents(
      totalBudgetIncome > 0 ? (totalBudgetSpent / totalBudgetIncome) * 100 : 0,
    );

    if (percentage > 100)
      return {
        status: "over",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    if (percentage < 100)
      return {
        status: "progress",
        color: "text-white",
        bg: "bg-secondary",
        border: "border-secondary",
      };
    return {
      status: "complete",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
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
    <div className="flex flex-col bg-gray-50 pt-16 sm:pt-8 lg:h-screen lg:pt-0">
      <PageHeader
        title="Budgets"
        description="Manage your financial budgets and track spending"
        action={{
          icon: <Plus className="h-4 w-4" />,
          label: "Create Budget",
          onClick: () => setIsCreateModalOpen(true),
        }}
      />

      <div className="flex flex-col lg:flex-1 lg:overflow-hidden">
        <div className="mx-auto w-full flex-shrink-0 px-2 py-3 sm:px-4 sm:py-4 lg:px-8">
          {/* Budget Overview Graphs - Replacing Stat Cards */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:gap-4">
            {/* Spending by Category Group Pie Chart */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Spending by Group
              </h3>
              {budgetStats.pieChartData.length > 0 ? (
                <>
                  <ChartContainer height={160}>
                    <PieChart>
                      <Pie
                        data={budgetStats.pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {budgetStats.pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
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
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] sm:text-xs">
                    {budgetStats.pieChartData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-8 w-8" />
                    <p className="text-xs">No data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Top Spending Categories Bar Chart */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Top Categories
              </h3>
              {budgetStats.topCategoriesData.length > 0 ? (
                <ChartContainer height={160}>
                  <BarChart data={budgetStats.topCategoriesData}>
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      fontSize={8}
                      tick={{ fontSize: 8 }}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        `$${typeof value === "number" ? (value / 1000).toFixed(0) + "k" : ""}`
                      }
                      fontSize={8}
                      width={40}
                    />
                    <Tooltip
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
                    <Bar dataKey="value" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-8 w-8" />
                    <p className="text-xs">No data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Spending Trend */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Daily Spending
              </h3>
              {budgetStats.dailySpendingData.length > 0 &&
              budgetStats.dailySpendingData.some((d) => d.spending > 0) ? (
                <ChartContainer height={160}>
                  <LineChart data={budgetStats.dailySpendingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      fontSize={8}
                      tick={{ fontSize: 8 }}
                      height={30}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        `$${typeof value === "number" ? (value / 1000).toFixed(0) + "k" : ""}`
                      }
                      fontSize={8}
                      width={40}
                    />
                    <Tooltip
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
                    <Line
                      type="monotone"
                      dataKey="spending"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="mx-auto mb-1 h-8 w-8" />
                    <p className="text-xs">No spending data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Active Budgets Summary */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Summary
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-purple-500 sm:h-4 sm:w-4" />
                    <span className="text-xs text-gray-600">Active</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 sm:text-base">
                    {budgetStats.activeBudgetsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    <span className="text-xs text-gray-600">Completed</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 sm:text-base">
                    {completedBudgets.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-blue-500 sm:h-4 sm:w-4" />
                    <span className="text-xs text-gray-600">Recent</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 sm:text-sm">
                    ${budgetStats.recentSpending.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                    <span className="text-xs text-gray-600">Daily Avg</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 sm:text-sm">
                    ${budgetStats.averageDailySpending.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Tabs */}
          <div className="mb-3 flex-shrink-0">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
                      activeTab === tab.id
                        ? activeTab === "active"
                          ? "border-secondary text-secondary"
                          : activeTab === "completed"
                            ? "border-green-600 text-green-600"
                            : "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-900">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Budgets List - Scrollable */}
        <div className="overflow-y-auto lg:flex-1">
          <div className="mx-auto w-full px-2 py-3 pb-40 sm:px-4 sm:py-4 sm:pb-40 lg:px-8 lg:pb-4">
            <div className="grid gap-4 sm:gap-6">
              {currentBudgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-8 text-center shadow-sm">
                  <div className="text-gray-400">
                    <Target className="mx-auto h-12 w-12" />
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
                      Create Budget
                    </Button>
                  )}
                </div>
              ) : (
                currentBudgets?.map((budget: BudgetWithRelations) => {
                  const budgetStatus = getBudgetStatus(budget);
                  const categorySummary = getCategorySummary(budget);
                  const totalBudgetIncome = calculateTotalIncome(budget);
                  const totalBudgetSpent = (budget.categories ?? []).reduce(
                    (sum: number, category) => {
                      return (
                        sum +
                        (category.transactions ?? []).reduce(
                          (transactionSum: number, transaction) => {
                            // Exclude INCOME and CARD_PAYMENT transactions from spending
                            if (
                              transaction.transactionType ===
                                TransactionType.INCOME ||
                              transaction.transactionType ===
                                TransactionType.CARD_PAYMENT
                            ) {
                              return transactionSum;
                            }
                            if (
                              transaction.transactionType ===
                              TransactionType.RETURN
                            ) {
                              // Returns reduce spending (positive amount = refund received)
                              return transactionSum - transaction.amount;
                            } else {
                              // Regular transactions: positive = purchases (increase spending)
                              return transactionSum + transaction.amount;
                            }
                          },
                          0,
                        )
                      );
                    },
                    0,
                  );
                  const budgetRemaining = totalBudgetIncome - totalBudgetSpent;
                  const spendingPercentage =
                    totalBudgetIncome > 0
                      ? (totalBudgetSpent / totalBudgetIncome) * 100
                      : 0;

                  // Calculate days remaining in budget period
                  const now = new Date();
                  const endDate = new Date(budget.endAt);
                  const daysRemaining = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  const isOverdue = daysRemaining < 0;

                  // Determine border color based on active tab
                  const getCardBorder = () => {
                    if (activeTab === "completed") return "border-green-500";
                    if (activeTab === "archived") return "border-red-500";
                    return budgetStatus.border; // Use original logic for active tab
                  };

                  return (
                    <div
                      key={budget.id}
                      className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:bg-black/5 hover:shadow-xl sm:p-6 ${getCardBorder()}`}
                      onClick={() => router.push(`/budgets/${budget.id}`)}
                    >
                      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                              {budget.name}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${budgetStatus.bg} ${budgetStatus.color}`}
                            >
                              {budgetStatus.status === "over"
                                ? "Over Budget"
                                : budgetStatus.status === "progress"
                                  ? "In Progress"
                                  : "Complete"}
                            </span>
                            {/* Action Icons */}
                            <div className="ml-auto flex items-center space-x-1">
                              {activeTab === "active" && (
                                <>
                                  <button
                                    onClick={async (e: MouseEvent) => {
                                      e.stopPropagation();
                                      await handleMarkCompleted(budget);
                                    }}
                                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600"
                                    title="Mark as Completed"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={async (e: MouseEvent) => {
                                      e.stopPropagation();
                                      await handleMarkArchived(budget);
                                    }}
                                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-secondary"
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
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600"
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
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                                title="Duplicate"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  handleDeleteBudget(budget);
                                }}
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4 sm:text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{budget.period.replace("_", " ")}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{budget.strategy.replace("_", " ")}</span>
                            </div>
                            {activeTab === "active" && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
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
                            <span>
                              Created{" "}
                              {new Date(budget.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                            ${totalBudgetIncome.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 sm:text-sm">
                            Total Budget
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500 sm:text-sm">
                            Progress
                          </span>
                          <span className="text-xs text-gray-500 sm:text-sm">
                            {spendingPercentage.toFixed(1)}% used
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
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
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900 sm:text-xl">
                            ${totalBudgetSpent.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 sm:text-sm">
                            Spent
                          </div>
                        </div>
                        <div>
                          <div
                            className={`text-lg font-bold sm:text-xl ${
                              budgetRemaining >= 0
                                ? "text-gray-900"
                                : "text-red-600"
                            }`}
                          >
                            ${Math.abs(budgetRemaining).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 sm:text-sm">
                            {budgetRemaining >= 0 ? "Remaining" : "Over Budget"}
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900 sm:text-xl">
                            {categorySummary.needs +
                              categorySummary.wants +
                              categorySummary.investments}
                          </div>
                          <div className="text-xs text-gray-500 sm:text-sm">
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
