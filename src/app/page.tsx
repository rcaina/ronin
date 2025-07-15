"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useTransactions } from "@/lib/data-hooks/transactions/useTransactions";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  ArrowRight,
  BarChart3,
  Receipt,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: transactions = [], isLoading: transactionsLoading } =
    useTransactions();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  if (
    status === "loading" ||
    budgetsLoading ||
    transactionsLoading ||
    categoriesLoading
  ) {
    return <LoadingSpinner message="Loading your financial overview..." />;
  }

  // Calculate financial metrics
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
  const spendingPercentage =
    totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

  // Get recent transactions (last 5)
  const recentTransactions = transactions
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  // Get budget status
  const getBudgetStatus = () => {
    if (spendingPercentage > 90)
      return {
        status: "over",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    if (spendingPercentage > 75)
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

  const budgetStatus = getBudgetStatus();

  // Get the most recent budget for the quick action
  const mostRecentBudget = budgets
    .filter((budget) => !budget.deleted)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "User"}! 👋`}
        description={`Here's your financial overview for ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
      />

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Financial Overview Cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <div className="rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Total Income
                </h3>
                <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                ${totalIncome.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                Across {activeBudgets} active budgets
              </div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Total Spent
                </h3>
                <TrendingDown className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                ${totalSpent.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                {spendingPercentage.toFixed(1)}% of total income
              </div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Remaining
                </h3>
                <TrendingUp className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
              </div>
              <div
                className={`text-lg font-bold sm:text-xl lg:text-2xl ${totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
              >
                ${totalRemaining.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                {totalRemaining >= 0 ? "Available" : "Over budget"}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Active Budgets
                </h3>
                <Target className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {activeBudgets}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                {totalBudgets} total budgets
              </div>
            </div>
          </div>

          {/* Budget Progress */}
          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
            <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Overall Budget Progress
              </h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium sm:px-3 sm:text-sm ${budgetStatus.bg} ${budgetStatus.color}`}
              >
                {budgetStatus.status === "over"
                  ? "Over Budget"
                  : budgetStatus.status === "warning"
                    ? "Warning"
                    : "On Track"}
              </span>
            </div>
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Spending Progress</span>
                <span className="font-medium">
                  {spendingPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 sm:h-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 sm:h-3 ${
                    spendingPercentage > 90
                      ? "bg-red-500"
                      : spendingPercentage > 75
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 sm:text-lg">
                  ${totalIncome.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 sm:text-sm">Budgeted</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 sm:text-lg">
                  ${totalSpent.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 sm:text-sm">Spent</div>
              </div>
              <div>
                <div
                  className={`text-sm font-semibold sm:text-lg ${totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                >
                  ${totalRemaining.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 sm:text-sm">
                  Remaining
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center">
                  <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                    Recent Activity
                  </h2>
                  <Link
                    href="/transactions"
                    className="flex items-center space-x-1 text-xs text-secondary hover:text-yellow-300 sm:text-sm"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                </div>

                {recentTransactions.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3 sm:p-4"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="bg-secondary/10 flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10">
                            <Receipt className="h-4 w-4 text-secondary sm:h-5 sm:w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 sm:text-base">
                              {transaction.name ?? "Unnamed transaction"}
                            </p>
                            <p className="text-xs text-gray-500 sm:text-sm">
                              {transaction.category?.category.name ??
                                "No Category"}
                              •{" "}
                              {new Date(
                                transaction.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 sm:text-base">
                            ${transaction.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center sm:py-8">
                    <Receipt className="mx-auto mb-3 h-8 w-8 text-gray-300 sm:mb-4 sm:h-12 sm:w-12" />
                    <p className="text-sm text-gray-500 sm:text-base">
                      No recent transactions
                    </p>
                    <p className="text-xs text-gray-400 sm:text-sm">
                      Start adding transactions to see them here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Insights */}
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Actions */}
              <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
                  Quick Actions
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  {mostRecentBudget && (
                    <button
                      onClick={() =>
                        router.push(`/budgets/${mostRecentBudget.id}`)
                      }
                      className="group flex w-full items-center space-x-2 rounded-lg border p-2 text-left transition-colors hover:bg-yellow-500/70 sm:space-x-3 sm:p-3"
                    >
                      <div className="bg-secondary/10 flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10">
                        <Target className="h-5 w-5 text-secondary group-hover:text-white sm:h-9 sm:w-9" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 sm:text-base">
                          Current Budget
                        </p>
                        <p className="text-xs text-gray-500 sm:text-sm">
                          {mostRecentBudget.name}
                        </p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => router.push("/budgets")}
                    className="flex w-full items-center space-x-2 rounded-lg border p-2 text-left transition-colors hover:bg-yellow-500/70 sm:space-x-3 sm:p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 sm:h-10 sm:w-10">
                      <Plus className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 sm:text-base">
                        Create Budget
                      </p>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        Set up a new budget plan
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/transactions")}
                    className="flex w-full items-center space-x-2 rounded-lg border p-2 text-left transition-colors hover:bg-yellow-500/70 sm:space-x-3 sm:p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 sm:h-10 sm:w-10">
                      <Receipt className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 sm:text-base">
                        Add Transaction
                      </p>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        Record a new expense
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/categories")}
                    className="flex w-full items-center space-x-2 rounded-lg border p-2 text-left transition-colors hover:bg-yellow-500/70 sm:space-x-3 sm:p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 sm:h-10 sm:w-10">
                      <BarChart3 className="h-4 w-4 text-purple-600 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 sm:text-base">
                        Manage Categories
                      </p>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        Organize your spending
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
                  Category Breakdown
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  {categories && "wants" in categories && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 sm:text-sm">
                          Wants
                        </span>
                        <span className="text-xs font-medium text-gray-900 sm:text-sm">
                          {categories.wants?.length ?? 0} categories
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 sm:text-sm">
                          Needs
                        </span>
                        <span className="text-xs font-medium text-gray-900 sm:text-sm">
                          {categories.needs?.length ?? 0} categories
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 sm:text-sm">
                          Investment
                        </span>
                        <span className="text-xs font-medium text-gray-900 sm:text-sm">
                          {categories.investment?.length ?? 0} categories
                        </span>
                      </div>
                    </>
                  )}
                  {(!categories ||
                    !("wants" in categories) ||
                    (categories.wants?.length === 0 &&
                      categories.needs?.length === 0 &&
                      categories.investment?.length === 0)) && (
                    <p className="text-xs text-gray-500 sm:text-sm">
                      No categories yet
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Tips */}
              <div className="from-secondary/10 rounded-xl border bg-gradient-to-br to-blue-500/10 p-4 sm:p-6">
                <div className="mb-2 flex items-center space-x-2 sm:mb-3">
                  <Sparkles className="h-4 w-4 text-secondary sm:h-5 sm:w-5" />
                  <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                    Financial Tip
                  </h3>
                </div>
                <p className="text-xs text-gray-600 sm:text-sm">
                  {spendingPercentage > 90
                    ? "You're over budget! Consider reviewing your spending habits and cutting back on non-essential expenses."
                    : spendingPercentage > 75
                      ? "You're approaching your budget limit. Keep an eye on your spending to stay on track."
                      : "Great job staying within your budget! You're on track to meet your financial goals."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
