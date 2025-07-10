"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  useBudgets,
  useDeleteBudget,
  useDuplicateBudget,
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
  Trash2,
  Info,
} from "lucide-react";
import type { BudgetWithRelations } from "@/lib/types/budget";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import { useMemo, useState } from "react";

const BudgetsPage = () => {
  const router = useRouter();
  const { data: budgets = [], isLoading, error } = useBudgets();
  const { data: allTransactions = [] } = useTransactions();
  const deleteBudgetMutation = useDeleteBudget();
  const duplicateBudgetMutation = useDuplicateBudget();

  const [budgetToDelete, setBudgetToDelete] =
    useState<BudgetWithRelations | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        (budget.categories ?? []).forEach((budgetCategory) => {
          // Skip if category relation is not loaded
          if (!budgetCategory.category) return;

          const group = budgetCategory.category.group?.toLowerCase();
          // Skip categories without a group
          if (!group) return;

          const categorySpent = (budgetCategory.transactions ?? []).reduce(
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
    const needs = categories.filter(
      (cat) => cat.category?.group === "NEEDS",
    ).length;
    const wants = categories.filter(
      (cat) => cat.category?.group === "WANTS",
    ).length;
    const investments = categories.filter(
      (cat) => cat.category?.group === "INVESTMENT",
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
      // Optionally, redirect to the new budget page:
      // if (result?.budget?.id) router.push(`/budgets/${result.budget.id}`);
    } catch (err) {
      toast.error("Failed to duplicate budget. Please try again.");
      console.error("Failed to duplicate budget:", err);
    }
  };

  const handleDeleteBudget = (budget: BudgetWithRelations) => {
    setBudgetToDelete(budget);
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;

    try {
      await deleteBudgetMutation.mutateAsync(budgetToDelete.id);
      setBudgetToDelete(null);
      toast.success("Budget deleted successfully!");
    } catch (err) {
      console.error("Failed to delete budget:", err);
      toast.error("Failed to delete budget. Please try again.");
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
          onClick: () => setIsCreateModalOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-2 py-16 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Enhanced Overview Stats */}
          {budgets.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
                <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                    Total Budgets
                  </h3>
                  <Target className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                </div>
                <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                  {budgetStats.totalBudgets}
                </div>
                <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                  {budgetStats.activeBudgets} active
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
                <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                    Total Income
                  </h3>
                  <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                </div>
                <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                  ${budgetStats.totalIncome.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Across all budgets
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
                <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                    Total Spent
                  </h3>
                  <TrendingDown className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
                </div>
                <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                  ${budgetStats.totalSpent.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                  {budgetStats.overallSpendingPercentage.toFixed(1)}% of total
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
                <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                  <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                    Remaining
                  </h3>
                  <TrendingUp className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                </div>
                <div
                  className={`text-lg font-bold sm:text-xl lg:text-2xl ${budgetStats.totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                >
                  ${budgetStats.totalRemaining.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                  {budgetStats.totalRemaining >= 0
                    ? "Available"
                    : "Over budget"}
                </div>
              </div>
            </div>
          )}

          {/* New Insights Section */}
          {budgets.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-3">
              {/* Spending Trends */}
              <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                  <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                    Recent Spending
                  </h3>
                  <Clock className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                      ${budgetStats.recentSpending.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 sm:text-sm">
                      Last 30 days
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-900 sm:text-lg">
                      ${budgetStats.averageDailySpending.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500 sm:text-sm">
                      Daily average
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Health Overview */}
              <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                      Budget Health
                    </h3>
                    <div className="group relative">
                      <Info className="h-4 w-4 cursor-help text-gray-400" />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <div className="w-80 rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg">
                          <div className="mb-1 font-medium">
                            Budget Health Score
                          </div>
                          <div className="text-gray-200">
                            Measures how well you&apos;re staying within your
                            budget limits. Higher scores indicate better budget
                            discipline and financial health.
                          </div>
                          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Zap className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <div
                      className={`text-xl font-bold sm:text-2xl ${getHealthScoreColor(budgetStats.averageHealthScore)}`}
                    >
                      {budgetStats.averageHealthScore.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500 sm:text-sm">
                      Average health score
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 sm:text-sm">
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
              <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                  <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                    Spending by Group
                  </h3>
                  <PieChart className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
                </div>
                <div className="space-y-2">
                  {Object.entries(budgetStats.spendingByGroup).length > 0 ? (
                    Object.entries(budgetStats.spendingByGroup).map(
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
                            <span className="text-xs font-medium capitalize text-gray-700 sm:text-sm">
                              {group}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-900 sm:text-sm">
                            ${amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500 sm:text-sm">
                        No spending data available
                      </p>
                      <p className="text-xs text-gray-400">
                        Add transactions to see spending by group
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Budgets List */}
          <div className="space-y-4 sm:space-y-6">
            {budgets?.length === 0 ? (
              <div className="rounded-xl border bg-white p-8 text-center shadow-sm sm:p-12">
                <Target className="mx-auto mb-3 h-12 w-12 text-gray-300 sm:mb-4 sm:h-16 sm:w-16" />
                <h3 className="mb-2 text-base font-medium text-gray-900 sm:text-lg">
                  No budgets yet
                </h3>
                <p className="mx-auto mb-4 max-w-sm text-sm text-gray-500 sm:mb-6 sm:text-base">
                  Create your first budget to start tracking your spending and
                  managing your finances effectively.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-300 sm:text-base"
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
                              onClick={() => handleDeleteBudget(budget)}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                              title="Delete Budget"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4 sm:text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{budget.period.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{budget.strategy.replace("_", " ")}</span>
                          </div>
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
                      <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
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
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                      <div className="rounded-lg bg-gray-50 p-2 text-center sm:p-3">
                        <div className="text-sm font-semibold text-gray-900 sm:text-lg">
                          ${totalBudgetSpent.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 sm:text-sm">
                          Spent
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-2 text-center sm:p-3">
                        <div
                          className={`text-sm font-semibold sm:text-lg ${budgetRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                        >
                          ${budgetRemaining.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 sm:text-sm">
                          Remaining
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-2 text-center sm:p-3">
                        <div className="text-sm font-semibold text-gray-900 sm:text-lg">
                          {budget.categories?.length ?? 0}
                        </div>
                        <div className="text-xs text-gray-500 sm:text-sm">
                          Categories
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-2 text-center sm:p-3">
                        <div
                          className={`text-sm font-semibold sm:text-lg ${healthScoreColor}`}
                        >
                          {healthScore}%
                        </div>
                        <div className="text-xs text-gray-500 sm:text-sm">
                          Health
                        </div>
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

      {/* Create Budget Modal */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default BudgetsPage;
