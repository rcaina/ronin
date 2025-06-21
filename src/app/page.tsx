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

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: transactions = [], isLoading: transactionsLoading } =
    useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  if (
    status === "loading" ||
    budgetsLoading ||
    transactionsLoading ||
    categoriesLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-secondary"></div>
          <div className="text-lg text-gray-600">
            Loading your financial overview...
          </div>
        </div>
      </div>
    );
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

  // Get category breakdown
  const categoryBreakdown = categories.reduce(
    (acc, category) => {
      const group = category.group.toLowerCase();
      acc[group] = (acc[group] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "User"}! 👋`}
        description={`Here's your financial overview for ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
        action={{
          label: "New Budget",
          onClick: () => router.push("/setup/budget"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Financial Overview Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
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
                Across {activeBudgets} active budgets
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
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
                {spendingPercentage.toFixed(1)}% of total income
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Remaining</h3>
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

            <div className="rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Active Budgets
                </h3>
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {activeBudgets}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {totalBudgets} total budgets
              </div>
            </div>
          </div>

          {/* Budget Progress */}
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Overall Budget Progress
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${budgetStatus.bg} ${budgetStatus.color}`}
              >
                {budgetStatus.status === "over"
                  ? "Over Budget"
                  : budgetStatus.status === "warning"
                    ? "Warning"
                    : "On Track"}
              </span>
            </div>
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Spending Progress</span>
                <span className="font-medium">
                  {spendingPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
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
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  ${totalIncome.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Budgeted</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  ${totalSpent.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Spent</div>
              </div>
              <div>
                <div
                  className={`text-lg font-semibold ${totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                >
                  ${totalRemaining.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Remaining</div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Activity
                  </h2>
                  <Link
                    href="/transactions"
                    className="flex items-center space-x-1 text-sm text-secondary hover:text-yellow-300"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-secondary/10 flex h-10 w-10 items-center justify-center rounded-full">
                            <Receipt className="h-5 w-5 text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.name ?? "Unnamed transaction"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.category.name} •{" "}
                              {new Date(
                                transaction.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ${transaction.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Receipt className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-gray-500">No recent transactions</p>
                    <p className="text-sm text-gray-400">
                      Start adding transactions to see them here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Insights */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/setup/budget")}
                    className="flex w-full items-center space-x-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Create Budget</p>
                      <p className="text-sm text-gray-500">
                        Set up a new budget plan
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/transactions")}
                    className="flex w-full items-center space-x-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Add Transaction
                      </p>
                      <p className="text-sm text-gray-500">
                        Record a new expense
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/categories")}
                    className="flex w-full items-center space-x-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Manage Categories
                      </p>
                      <p className="text-sm text-gray-500">
                        Organize your spending
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Category Breakdown
                </h2>
                <div className="space-y-3">
                  {Object.entries(categoryBreakdown).map(([group, count]) => (
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
                        ></div>
                        <span className="text-sm font-medium capitalize text-gray-900">
                          {group}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {count} categories
                      </span>
                    </div>
                  ))}
                  {Object.keys(categoryBreakdown).length === 0 && (
                    <p className="text-sm text-gray-500">No categories yet</p>
                  )}
                </div>
              </div>

              {/* Financial Tips */}
              <div className="from-secondary/10 rounded-xl border bg-gradient-to-br to-blue-500/10 p-6">
                <div className="mb-3 flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-secondary" />
                  <h3 className="font-semibold text-gray-900">Financial Tip</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {spendingPercentage > 90
                    ? "You're over budget! Consider reviewing your spending habits and cutting back on non-essential expenses."
                    : spendingPercentage > 75
                      ? "You're approaching your budget limit. Keep an eye on your spending to stay on track."
                      : "Great job staying within your budget! You're on track to meet your financial goals."}
                </p>
              </div>
            </div>
          </div>

          {/* Budget Cards Preview */}
          {budgets.length > 0 && (
            <div className="mt-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Budgets
                </h2>
                <Link
                  href="/budgets"
                  className="flex items-center space-x-1 text-sm text-secondary hover:text-yellow-300"
                >
                  <span>View All Budgets</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets.slice(0, 3).map((budget) => {
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
                  const budgetPercentage =
                    budgetIncome > 0 ? (budgetSpent / budgetIncome) * 100 : 0;

                  return (
                    <div
                      key={budget.id}
                      onClick={() => router.push(`/budgets/${budget.id}`)}
                      className="cursor-pointer rounded-xl border bg-white p-6 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          {budget.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            budgetPercentage > 90
                              ? "bg-red-100 text-red-800"
                              : budgetPercentage > 75
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {budgetPercentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mb-3">
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              budgetPercentage > 90
                                ? "bg-red-500"
                                : budgetPercentage > 75
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(budgetPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          ${budgetIncome.toLocaleString()}
                        </span>
                        <span className="text-gray-500">
                          ${budgetSpent.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
