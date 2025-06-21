"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams } from "next/navigation";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const { data: budget, isLoading, error } = useBudget(id as string);

  if (isLoading) {
    return <LoadingSpinner message="Loading budget..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <TrendingDown className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">Error loading budget</div>
          <div className="text-sm text-gray-500">{error.message}</div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <Target className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Budget not found</div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalIncome = (budget.incomes ?? []).reduce(
    (sum, income) => sum + income.amount,
    0,
  );
  const totalSpent = (budget.categories ?? []).reduce(
    (categoryTotal: number, category) => {
      const categorySpent = (category.transactions ?? []).reduce(
        (transactionTotal: number, transaction) => {
          return transactionTotal + transaction.amount;
        },
        0,
      );
      return categoryTotal + categorySpent;
    },
    0,
  );
  const totalRemaining = totalIncome - totalSpent;
  const spendingPercentage =
    totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

  // Group categories by type
  const categoriesByGroup = (budget.categories ?? []).reduce(
    (acc, category) => {
      const group = category.group.toLowerCase();
      acc[group] ??= [];
      acc[group].push(category);
      return acc;
    },
    {} as Record<string, typeof budget.categories>,
  );

  const getGroupColor = (group: string) => {
    switch (group) {
      case "needs":
        return "bg-blue-500";
      case "wants":
        return "bg-purple-500";
      case "investment":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

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

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={budget.name}
        description={`${budget.period.replace("_", " ")} Budget • Created ${new Date(
          budget.createdAt,
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`}
        backButton={{
          onClick: () => window.history.back(),
        }}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Budget Overview Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
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
                {budget.incomes?.[0]?.source ?? "Primary income"}
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
                {spendingPercentage.toFixed(1)}% of budget
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
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
          </div>

          {/* Progress Bar */}
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Budget Progress
              </h3>
              <span className="text-sm text-gray-500">
                {spendingPercentage.toFixed(1)}% used
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

          {/* Budget Details */}
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Budget Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-gray-500">Strategy:</span>
                <p className="font-medium">
                  {budget.strategy.replace("_", " ")}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Period:</span>
                <p className="font-medium">{budget.period.replace("_", " ")}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Start Date:</span>
                <p className="font-medium">
                  {new Date(budget.startAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">End Date:</span>
                <p className="font-medium">
                  {new Date(budget.endAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Categories by Group */}
          {Object.entries(categoriesByGroup).map(([group, categories]) => (
            <div key={group} className="mb-8">
              <div className="mb-4 flex items-center">
                <div
                  className={`h-3 w-3 rounded-full ${getGroupColor(group)} mr-3`}
                ></div>
                <h2 className="text-xl font-bold text-gray-900">
                  {getGroupLabel(group)}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categories?.map((category) => {
                  const categorySpent = (category.transactions ?? []).reduce(
                    (acc, transaction) => acc + transaction.amount,
                    0,
                  );
                  const categoryRemaining =
                    category.spendingLimit - categorySpent;
                  const categoryPercentage =
                    (categorySpent / category.spendingLimit) * 100;

                  return (
                    <div
                      key={category.id}
                      className="rounded-xl border bg-white p-6 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            categoryPercentage > 90
                              ? "bg-red-100 text-red-800"
                              : categoryPercentage > 75
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {categoryPercentage.toFixed(0)}%
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-gray-500">Limit</span>
                            <span className="font-medium">
                              $
                              {category.spendingLimit
                                .toFixed(2)
                                .toLocaleString()}
                            </span>
                          </div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-gray-500">Spent</span>
                            <span className="font-medium">
                              ${categorySpent.toFixed(2).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Remaining</span>
                            <span
                              className={`font-medium ${categoryRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
                            >
                              ${categoryRemaining.toFixed(2).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              categoryPercentage > 90
                                ? "bg-red-500"
                                : categoryPercentage > 75
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(categoryPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Recent Transactions */}
                      {category.transactions &&
                        category.transactions.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="mb-2 text-sm font-medium text-gray-700">
                              Recent Transactions
                            </h4>
                            <div className="space-y-2">
                              {category.transactions
                                .slice(0, 3)
                                .map((transaction) => (
                                  <div
                                    key={transaction.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-gray-900">
                                        {transaction.name ??
                                          "Unnamed transaction"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(
                                          transaction.createdAt,
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <span className="font-medium text-gray-900">
                                      $
                                      {transaction.amount
                                        .toFixed(2)
                                        .toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              {category.transactions.length > 3 && (
                                <p className="text-center text-xs text-gray-500">
                                  +{category.transactions.length - 3} more
                                  transactions
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* All Transactions */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              All Transactions
            </h3>
            <div className="space-y-4">
              {(budget.categories ?? [])
                .flatMap((category) =>
                  (category.transactions ?? []).map((transaction) => ({
                    ...transaction,
                    categoryName: category.name,
                    categoryGroup: category.group,
                  })),
                )
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-3 w-3 rounded-full ${getGroupColor(transaction.categoryGroup.toLowerCase())}`}
                        ></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.name ?? "Unnamed transaction"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {transaction.categoryName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ${transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              {(budget.categories ?? []).flatMap(
                (cat) => cat.transactions ?? [],
              ).length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p>No transactions yet</p>
                  <p className="text-sm">
                    Start adding transactions to see them here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDetailsPage;
