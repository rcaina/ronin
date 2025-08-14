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
  TrendingDown,
  BarChart3,
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
import {
  useDeleteBudget,
  useDuplicateBudget,
} from "@/lib/data-hooks/budgets/useBudgets";
import type { BudgetWithRelations } from "@/lib/types/budget";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import StatsCard from "@/components/StatsCard";
import { CategoryType, TransactionType } from "@prisma/client";
import Button from "@/components/Button";

type TabType = "active" | "completed" | "archived";

// Helper function to calculate total income from all income sources
const calculateTotalIncome = (budget: BudgetWithRelations): number => {
  return (budget.incomes ?? []).reduce((sum, income) => sum + income.amount, 0);
};

const BudgetsPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [budgetToDelete, setBudgetToDelete] =
    useState<BudgetWithRelations | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Data hooks for different budget statuses (excluding card payments for calculations)
  const { data: activeBudgets = [], isLoading: activeLoading } =
    useActiveBudgets(true);
  const { data: completedBudgets = [], isLoading: completedLoading } =
    useCompletedBudgets(true);
  const { data: archivedBudgets = [], isLoading: archivedLoading } =
    useArchivedBudgets(true);

  // Mutation hooks
  const deleteBudgetMutation = useDeleteBudget();
  const duplicateBudgetMutation = useDuplicateBudget();
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
          const group = category.category?.group.toLowerCase() ?? "unknown";
          const spent = (category.transactions ?? []).reduce(
            (sum, transaction) => {
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
      {} as Record<string, number>,
    );

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

    // Calculate budget health metrics for active budgets
    const budgetHealthScores = activeBudgets.map((budget) => {
      const budgetIncome = calculateTotalIncome(budget);
      const budgetSpent = (budget.categories ?? []).reduce(
        (sum, category) =>
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum, transaction) => {
              if (transaction.transactionType === TransactionType.RETURN) {
                // Returns reduce spending (positive amount = refund received)
                return transactionSum - transaction.amount;
              } else {
                // Regular transactions: positive = purchases (increase spending)
                return transactionSum + transaction.amount;
              }
            },
            0,
          ),
        0,
      );
      const percentage =
        budgetIncome > 0 ? (budgetSpent / budgetIncome) * 100 : 0;

      // Health score: 100 = perfect, 0 = terrible
      let healthScore = 100;
      if (percentage > 100) healthScore = 0;
      else if (percentage > 90) healthScore = 20;
      else if (percentage > 75) healthScore = 60;
      else if (percentage > 50) healthScore = 80;

      return { budgetId: budget.id, healthScore, percentage };
    });

    const averageHealthScore =
      budgetHealthScores.length > 0
        ? budgetHealthScores.reduce(
            (sum, score) => sum + score.healthScore,
            0,
          ) / budgetHealthScores.length
        : 0;

    // Find most and least healthy budgets
    const sortedByHealth = [...budgetHealthScores].sort(
      (a, b) => b.healthScore - a.healthScore,
    );
    const healthiestBudget = sortedByHealth[0];
    const leastHealthyBudget = sortedByHealth[sortedByHealth.length - 1];

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
      averageHealthScore,
      healthiestBudget,
      leastHealthyBudget,
      budgetHealthScores,
    };
  }, [activeBudgets, completedBudgets, archivedBudgets]);

  if (isLoading) {
    return <LoadingSpinner message="Loading budgets..." />;
  }

  const getBudgetStatus = (budget: BudgetWithRelations) => {
    const totalBudgetIncome = calculateTotalIncome(budget);
    const totalBudgetSpent = (budget.categories ?? []).reduce(
      (sum: number, category) => {
        return (
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum: number, transaction) => {
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
      },
      0,
    );
    const percentage =
      totalBudgetIncome > 0 ? (totalBudgetSpent / totalBudgetIncome) * 100 : 0;

    if (percentage > 90)
      return {
        status: "over",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    if (percentage > 75)
      return {
        status: "warning",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
      };
    return {
      status: "good",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    };
  };

  const getCategorySummary = (budget: BudgetWithRelations) => {
    const categories = budget.categories ?? [];
    const needs = categories.filter(
      (cat) => cat.category?.group === CategoryType.NEEDS,
    ).length;
    const wants = categories.filter(
      (cat) => cat.category?.group === CategoryType.WANTS,
    ).length;
    const investments = categories.filter(
      (cat) => cat.category?.group === CategoryType.INVESTMENT,
    ).length;

    return { needs, wants, investments };
  };

  const getBudgetHealthScore = (budgetId: string) => {
    const score = budgetStats.budgetHealthScores.find(
      (s) => s.budgetId === budgetId,
    );
    return score?.healthScore ?? 0;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Poor";
    return "Critical";
  };

  const handleDuplicateBudget = async (budget: BudgetWithRelations) => {
    try {
      await duplicateBudgetMutation.mutateAsync(budget.id);
      toast.success("Budget duplicated successfully!");
    } catch (err) {
      toast.error("Failed to duplicate budget. Please try again.");
      console.error("Failed to duplicate budget:", err);
    }
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
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Budgets"
        description="Manage your financial budgets and track spending"
        action={{
          icon: <Plus className="h-4 w-4" />,
          label: "Create Budget",
          onClick: () => setIsCreateModalOpen(true),
        }}
      />

      <div className="flex-1 overflow-x-hidden pt-16 sm:pt-20 lg:pt-0">
        <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Budget Statistics Cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <StatsCard
              title="Active Budgets"
              value={budgetStats.activeBudgetsCount}
              subtitle={`${budgetStats.totalBudgets} total budgets`}
              icon={
                <Target className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-purple-500"
            />

            <StatsCard
              title="Total Income"
              value={`$${budgetStats.totalIncome.toLocaleString()}`}
              subtitle="Active budgets only"
              icon={
                <TrendingUp className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-green-500"
            />

            <StatsCard
              title="Total Spent"
              value={`$${budgetStats.totalSpent.toLocaleString()}`}
              subtitle={`${budgetStats.overallSpendingPercentage.toFixed(1)}% of budget`}
              icon={
                <TrendingDown className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-red-500"
            />

            <StatsCard
              title="Health Score"
              value={`${budgetStats.averageHealthScore.toFixed(0)}%`}
              subtitle="Average score"
              icon={
                <BarChart3 className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-blue-500"
            />
          </div>

          {/* Budget Progress */}
          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
            <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Overall Budget Progress
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 sm:text-sm">
                  {budgetStats.totalRemaining >= 0
                    ? "Remaining:"
                    : "Over budget:"}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    budgetStats.totalRemaining >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  ${Math.abs(budgetStats.totalRemaining).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 sm:h-3">
              <div
                className={`h-2 rounded-full transition-all duration-300 sm:h-3 ${
                  budgetStats.overallSpendingPercentage > 90
                    ? "bg-red-500"
                    : budgetStats.overallSpendingPercentage > 75
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(budgetStats.overallSpendingPercentage, 100)}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Budget Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
                      activeTab === tab.id
                        ? "border-yellow-500 text-yellow-600"
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

          {/* Budgets List */}
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

                const healthScore = getBudgetHealthScore(budget.id);
                const healthScoreColor = getHealthScoreColor(healthScore);
                const healthScoreLabel = getHealthScoreLabel(healthScore);

                // Calculate days remaining in budget period
                const now = new Date();
                const endDate = new Date(budget.endAt);
                const daysRemaining = Math.ceil(
                  (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                );
                const isOverdue = daysRemaining < 0;

                return (
                  <div
                    key={budget.id}
                    className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:bg-black/5 hover:shadow-xl sm:p-6 ${budgetStatus.border}`}
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
                              : budgetStatus.status === "warning"
                                ? "Warning"
                                : "On Track"}
                          </span>
                          <span
                            className={`rounded-full bg-gray-100 px-2 py-1 text-xs font-medium ${healthScoreColor}`}
                          >
                            {healthScoreLabel} ({healthScore}%)
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
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-yellow-600"
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
                              onClick={async (e: MouseEvent) => {
                                e.stopPropagation();
                                await handleDuplicateBudget(budget);
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
                            spendingPercentage > 90
                              ? "bg-red-500"
                              : spendingPercentage > 75
                                ? "bg-yellow-500"
                                : "bg-green-500"
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

      {/* Modals */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          toast.success("Budget created successfully!");
        }}
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
