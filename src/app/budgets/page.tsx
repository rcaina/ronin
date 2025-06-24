"use client";

import { useRouter } from "next/navigation";
import {
  useBudgets,
  useUpdateBudget,
  useDeleteBudget,
} from "@/lib/data-hooks/budgets/useBudgets";
import { useTransactions } from "@/lib/data-hooks/transactions/useTransactions";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
  Clock,
  PieChart,
  Zap,
  Eye,
  Copy,
  Edit,
  Trash2,
} from "lucide-react";
import type { BudgetWithRelations } from "@/lib/types/budget";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { useMemo, useState } from "react";

const BudgetsPage = () => {
  const router = useRouter();
  const { data: budgets = [], isLoading, error } = useBudgets();
  const { data: allTransactions = [] } = useTransactions();
  const deleteBudgetMutation = useDeleteBudget();

  const [budgetToDelete, setBudgetToDelete] =
    useState<BudgetWithRelations | null>(null);

  // Enhanced budget statistics with more sophisticated calculations
  const budgetStats = useMemo(() => {
    const totalBudgets = budgets.length;
    const activeBudgets = budgets.filter((budget) => !budget.deleted).length;

    // Calculate total income and spending
    const totalIncome = budgets.reduce((sum, budget) => {
      return sum + (budget.incomes?.[0]?.amount ?? 0);
    }, 0);

    const totalSpent = budgets.reduce((sum, budget) => {
      return (
        sum +
        (budget.categories ?? []).reduce((categorySum, category) => {
          return (
            categorySum +
            (category.transactions ?? []).reduce(
              (transactionSum, transaction) => {
                return transactionSum + transaction.amount;
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

    // Calculate spending by category groups across all budgets
    const spendingByGroup = budgets.reduce(
      (acc, budget) => {
        (budget.categories ?? []).forEach((category) => {
          const group = category.group?.toLowerCase();
          const categorySpent = (category.transactions ?? []).reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
          );
          acc[group] = (acc[group] ?? 0) + categorySpent;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate recent spending trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = allTransactions.filter(
      (transaction) => new Date(transaction.createdAt) >= thirtyDaysAgo,
    );

    const recentSpending = recentTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const averageDailySpending = recentSpending / 30;

    // Calculate budget health metrics
    const budgetHealthScores = budgets.map((budget) => {
      const budgetIncome = budget.incomes?.[0]?.amount ?? 0;
      const budgetSpent = (budget.categories ?? []).reduce(
        (sum, category) =>
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum, transaction) =>
              transactionSum + transaction.amount,
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
      activeBudgets,
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
  }, [budgets, allTransactions]);

  if (isLoading) {
    return <LoadingSpinner message="Loading budgets..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">Error loading budgets</div>
          <div className="text-sm text-gray-500">{error.message}</div>
        </div>
      </div>
    );
  }

  const getBudgetStatus = (budget: BudgetWithRelations) => {
    const totalBudgetIncome = budget.incomes?.[0]?.amount ?? 0;
    const totalBudgetSpent = (budget.categories ?? []).reduce(
      (sum: number, category) => {
        return (
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum: number, transaction) => {
              return transactionSum + transaction.amount;
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
    const needs = categories.filter((cat) => cat.group === "NEEDS").length;
    const wants = categories.filter((cat) => cat.group === "WANTS").length;
    const investments = categories.filter(
      (cat) => cat.group === "INVESTMENT",
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
      // Navigate to the budget setup page with the budget data pre-filled
      // We'll use the existing setup flow but with the budget data
      router.push(`/setup/budget?duplicate=${budget.id}`);
    } catch (err) {
      console.error("Failed to duplicate budget:", err);
    }
  };

  const handleEditBudget = (budget: BudgetWithRelations) => {
    // Navigate to the budget setup page for editing
    router.push(`/setup/budget?edit=${budget.id}`);
  };

  const handleDeleteBudget = (budget: BudgetWithRelations) => {
    setBudgetToDelete(budget);
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;

    try {
      await deleteBudgetMutation.mutateAsync(budgetToDelete.id);
      setBudgetToDelete(null);
    } catch (err) {
      console.error("Failed to delete budget:", err);
    }
  };

  const handleCancelDelete = () => {
    setBudgetToDelete(null);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Budgets"
        description="Manage your financial plans and track spending"
        action={{
          label: "Add Budget",
          onClick: () => router.push("/setup/budget"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Enhanced Overview Stats */}
          {budgets.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Budgets
                  </h3>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {budgetStats.totalBudgets}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {budgetStats.activeBudgets} active
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Income
                  </h3>
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${budgetStats.totalIncome.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Across all budgets
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Spent
                  </h3>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${budgetStats.totalSpent.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {budgetStats.overallSpendingPercentage.toFixed(1)}% of total
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">
                    Remaining
                  </h3>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div
                  className={`text-2xl font-bold ${budgetStats.totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                >
                  ${budgetStats.totalRemaining.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {budgetStats.totalRemaining >= 0
                    ? "Available"
                    : "Over budget"}
                </div>
              </div>
            </div>
          )}

          {/* New Insights Section */}
          {budgets.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Spending Trends */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recent Spending
                  </h3>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${budgetStats.recentSpending.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Last 30 days</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${budgetStats.averageDailySpending.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500">Daily average</div>
                  </div>
                </div>
              </div>

              {/* Budget Health Overview */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Budget Health
                  </h3>
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div
                      className={`text-2xl font-bold ${getHealthScoreColor(budgetStats.averageHealthScore)}`}
                    >
                      {budgetStats.averageHealthScore.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      Average health score
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {budgetStats.healthiestBudget && (
                      <div className="mb-1">
                        <span className="font-medium">Healthiest:</span>{" "}
                        {budgetStats.healthiestBudget.healthScore}%
                      </div>
                    )}
                    {budgetStats.leastHealthyBudget &&
                      budgetStats.leastHealthyBudget.budgetId !==
                        budgetStats.healthiestBudget?.budgetId && (
                        <div>
                          <span className="font-medium">Needs attention:</span>{" "}
                          {budgetStats.leastHealthyBudget.healthScore}%
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Category Group Spending */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Spending by Group
                  </h3>
                  <PieChart className="h-5 w-5 text-purple-500" />
                </div>
                <div className="space-y-2">
                  {Object.entries(budgetStats.spendingByGroup).map(
                    ([group, amount]) => (
                      <div
                        key={group}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              group === "needs"
                                ? "bg-blue-500"
                                : group === "wants"
                                  ? "bg-purple-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <span className="text-sm font-medium capitalize text-gray-700">
                            {group}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Budgets List */}
          <div className="space-y-6">
            {budgets?.length === 0 ? (
              <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
                <Target className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No budgets yet
                </h3>
                <p className="mx-auto mb-6 max-w-sm text-gray-500">
                  Create your first budget to start tracking your spending and
                  managing your finances effectively.
                </p>
                <button
                  onClick={() => router.push("/setup/budget")}
                  className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-white transition-colors hover:bg-yellow-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Budget
                </button>
              </div>
            ) : (
              budgets?.map((budget: BudgetWithRelations) => {
                const budgetStatus = getBudgetStatus(budget);
                const categorySummary = getCategorySummary(budget);
                const totalBudgetIncome = budget.incomes?.[0]?.amount ?? 0;
                const totalBudgetSpent = (budget.categories ?? []).reduce(
                  (sum: number, category) => {
                    return (
                      sum +
                      (category.transactions ?? []).reduce(
                        (transactionSum: number, transaction) => {
                          return transactionSum + transaction.amount;
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
                    className={`cursor-pointer rounded-xl border bg-white p-6 shadow-sm transition-all duration-200 hover:bg-black/5 hover:shadow-xl ${budgetStatus.border}`}
                    onClick={() => router.push(`/budgets/${budget.id}`)}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center space-x-3">
                          <h3 className="text-xl font-bold text-gray-900">
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
                          <div
                            className="flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDuplicateBudget(budget)}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                              title="Duplicate Budget"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditBudget(budget)}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600"
                              title="Edit Budget"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBudget(budget)}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                              title="Delete Budget"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{budget.period.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span>{budget.strategy.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
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
                          <span>
                            Created{" "}
                            {new Date(budget.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${totalBudgetIncome.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Total Budget
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-500">Spending Progress</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {spendingPercentage.toFixed(1)}%
                          </span>
                        </div>
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

                    {/* Enhanced Budget Stats */}
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          ${totalBudgetSpent.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Spent</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div
                          className={`text-lg font-semibold ${budgetRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                        >
                          ${budgetRemaining.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Remaining</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {budget.categories?.length ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Categories</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <div
                          className={`text-lg font-semibold ${healthScoreColor}`}
                        >
                          {healthScore}%
                        </div>
                        <div className="text-sm text-gray-500">Health</div>
                      </div>
                    </div>

                    {/* Category Summary */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>
                          Categories: {categorySummary.needs} Needs,{" "}
                          {categorySummary.wants} Wants,{" "}
                          {categorySummary.investments} Investment
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>View Details</span>
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!budgetToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Budget"
        message="Are you sure you want to delete {itemName}? This action cannot be undone and will also delete all associated income records and category allocations."
        itemName={budgetToDelete?.name ?? ""}
        confirmText="Delete Budget"
        cancelText="Cancel"
        isLoading={deleteBudgetMutation.isPending}
      />
    </div>
  );
};

export default BudgetsPage;
