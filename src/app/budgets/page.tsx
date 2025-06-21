"use client";

//show a list of budgets that are clickable
import { useRouter } from "next/navigation";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
} from "lucide-react";
import type { BudgetWithRelations } from "@/lib/types/budget";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";

const BudgetsPage = () => {
  const router = useRouter();
  const { data: budgets = [], isLoading, error } = useBudgets();

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

  // Calculate budget statistics
  const totalBudgets = budgets.length;
  const activeBudgets = budgets.filter((budget) => !budget.deleted).length;
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
          {/* Overview Stats */}
          {budgets.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Budgets
                  </h3>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalBudgets}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {activeBudgets} active
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
                  ${totalIncome.toLocaleString()}
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
                  ${totalSpent.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {totalIncome > 0
                    ? `${((totalSpent / totalIncome) * 100).toFixed(1)}%`
                    : "0%"}{" "}
                  of total
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
                  className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                >
                  ${totalRemaining.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {totalRemaining >= 0 ? "Available" : "Over budget"}
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
                        <span className="font-medium">
                          {spendingPercentage.toFixed(1)}%
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

                    {/* Budget Stats */}
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        <TrendingUp className="h-4 w-4" />
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
  );
};

export default BudgetsPage;
