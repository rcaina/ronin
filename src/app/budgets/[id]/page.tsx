"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  EditIcon,
  Calendar,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import { useState } from "react";
import EditBudgetModal from "@/components/budgets/EditBudgetModal";
import StatsCard from "@/components/StatsCard";
import { TransactionType } from "@prisma/client";
import IncomeModal from "@/components/budgets/IncomeModal";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isCardPaymentOpen, setIsCardPaymentOpen] = useState(false);
  const {
    data: budget,
    isLoading,
    error,
    refetch,
  } = useBudget(id as string, true); // Exclude card payments for calculations

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
  const totalSpent =
    (budget.categories ?? []).reduce((categoryTotal: number, category) => {
      const categorySpent = (category.transactions ?? []).reduce(
        (transactionTotal: number, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return transactionTotal - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return transactionTotal + transaction.amount;
          }
        },
        0,
      );
      return categoryTotal + categorySpent;
    }, 0) +
    (budget.transactions ?? []).reduce((total: number, transaction) => {
      if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce spending (positive amount = refund received)
        return total - transaction.amount;
      } else {
        // Regular transactions: positive = purchases (increase spending)
        return total + transaction.amount;
      }
    }, 0);
  const totalRemaining = totalIncome - totalSpent;
  const spendingPercentage =
    totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

  // Calculate days remaining
  const today = new Date();
  const endDate = new Date(budget.endAt);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isBudgetExpired = daysRemaining < 0;

  // Group categories by type and sort by usage percentage
  const categoriesByGroup = (budget.categories ?? []).reduce(
    (acc, budgetCategory) => {
      // Skip if category relation is not loaded
      if (!budgetCategory.category) return acc;

      const group = budgetCategory.category.group.toLowerCase();
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
        const aSpent = (a.transactions ?? []).reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return sum - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return sum + transaction.amount;
          }
        }, 0);
        const bSpent = (b.transactions ?? []).reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return sum - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return sum + transaction.amount;
          }
        }, 0);

        const aPercentage =
          a.allocatedAmount > 0 ? (aSpent / a.allocatedAmount) * 100 : 0;
        const bPercentage =
          b.allocatedAmount > 0 ? (bSpent / b.allocatedAmount) * 100 : 0;

        // Sort by percentage ascending (100% used categories at bottom)
        return aPercentage - bPercentage;
      });
    }
  });

  const getGroupColor = (group: string) => {
    switch (group) {
      case "needs":
        return "bg-blue-500";
      case "wants":
        return "bg-purple-500";
      case "investment":
        return "bg-green-500";
      case "card_payment":
        return "bg-black";
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

  const handleIncomeSuccess = () => {
    void refetch();
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
        actions={[
          {
            icon: <Plus className="h-4 w-4" />,
            label: "Add Transaction",
            onClick: () => {
              setIsAddTransactionOpen(true);
            },
            variant: "primary",
          },
          {
            icon: <DollarSign className="h-4 w-4" />,
            label: "Pay Credit Card",
            onClick: () => {
              setIsCardPaymentOpen(true);
            },
            variant: "secondary",
          },
        ]}
      />

      <div className="flex-1 overflow-hidden pt-16 sm:pt-24 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            {/* Budget Overview Cards */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              <div className="group relative">
                <StatsCard
                  title="Total Income"
                  value={`$${totalIncome.toLocaleString()}`}
                  subtitle={
                    budget.incomes?.length === 1
                      ? (budget.incomes[0]?.source ?? "Primary income")
                      : `${budget.incomes?.length ?? 0} income sources`
                  }
                  icon={
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsIncomeModalOpen(true);
                        }}
                        className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                        title="Edit income sources"
                      >
                        <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                    </div>
                  }
                  iconColor="text-green-500"
                  hover={true}
                />
              </div>

              <StatsCard
                title="Total Spent"
                value={`$${totalSpent.toLocaleString()}`}
                subtitle={`${spendingPercentage.toFixed(1)}% of budget`}
                icon={
                  <TrendingDown className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-red-500"
              />

              <StatsCard
                title="Remaining"
                value={`$${totalRemaining.toLocaleString()}`}
                subtitle={totalRemaining >= 0 ? "Available" : "Over budget"}
                icon={
                  <TrendingUp className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-blue-500"
                valueColor={
                  totalRemaining >= 0 ? "text-gray-900" : "text-red-600"
                }
              />

              <StatsCard
                title="Days Remaining"
                value={
                  isBudgetExpired ? Math.abs(daysRemaining) : daysRemaining
                }
                subtitle={
                  isBudgetExpired
                    ? "Days expired"
                    : daysRemaining <= 7
                      ? "Ending soon"
                      : "Days left"
                }
                icon={
                  <Calendar className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-orange-500"
                valueColor={
                  isBudgetExpired
                    ? "text-red-600"
                    : daysRemaining <= 7
                      ? "text-orange-600"
                      : "text-gray-900"
                }
              />
            </div>

            {/* Progress Bar */}
            <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-4">
                <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                  Budget Progress
                </h3>
                <span className="text-xs text-gray-500 sm:text-sm">
                  {spendingPercentage.toFixed(1)}% used
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

            {/* Budget Details */}
            <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-4">
                <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                  Budget Details
                </h3>
                <button
                  onClick={() => setIsEditBudgetOpen(true)}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Edit budget details"
                >
                  <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
                <div>
                  <span className="text-xs text-gray-500 sm:text-sm">
                    Strategy:
                  </span>
                  <p className="text-sm font-medium sm:text-base">
                    {budget.strategy.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 sm:text-sm">
                    Period:
                  </span>
                  <p className="text-sm font-medium sm:text-base">
                    {budget.period.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 sm:text-sm">
                    Start Date:
                  </span>
                  <p className="text-sm font-medium sm:text-base">
                    {new Date(budget.startAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 sm:text-sm">
                    End Date:
                  </span>
                  <p className="text-sm font-medium sm:text-base">
                    {new Date(budget.endAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Categories Summary */}
            <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                  Categories Summary
                </h3>
                <button
                  onClick={() =>
                    router.push(`/budgets/${String(id)}/categories`)
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-sm"
                >
                  View Details
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(categoriesByGroup)
                  .filter(([group]) => group !== "card_payment")
                  .map(([group, categories]) => {
                    if (!categories || categories.length === 0) return null;

                    // Calculate totals for this group
                    const totalAllocated = categories.reduce(
                      (sum, cat) => sum + cat.allocatedAmount,
                      0,
                    );

                    const totalSpent = categories.reduce((sum, cat) => {
                      const categorySpent = (cat.transactions ?? []).reduce(
                        (transactionTotal: number, transaction) => {
                          if (
                            transaction.transactionType ===
                            TransactionType.RETURN
                          ) {
                            return transactionTotal - transaction.amount;
                          } else {
                            return transactionTotal + transaction.amount;
                          }
                        },
                        0,
                      );
                      return sum + categorySpent;
                    }, 0);

                    const usagePercentage =
                      totalAllocated > 0
                        ? (totalSpent / totalAllocated) * 100
                        : 0;

                    // Count categories that are 100% used
                    const fullyUsedCount = categories.filter((cat) => {
                      const categorySpent = (cat.transactions ?? []).reduce(
                        (transactionTotal: number, transaction) => {
                          if (
                            transaction.transactionType ===
                            TransactionType.RETURN
                          ) {
                            return transactionTotal - transaction.amount;
                          } else {
                            return transactionTotal + transaction.amount;
                          }
                        },
                        0,
                      );
                      const categoryPercentage =
                        cat.allocatedAmount > 0
                          ? (categorySpent / cat.allocatedAmount) * 100
                          : 0;
                      return categoryPercentage >= 100;
                    }).length;

                    return (
                      <div key={group} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`h-3 w-3 rounded-full ${getGroupColor(group)}`}
                            ></div>
                            <span className="text-sm font-medium text-gray-900">
                              {getGroupLabel(group)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({fullyUsedCount}/{categories.length} fully used)
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ${totalSpent.toLocaleString()} / $
                              {totalAllocated.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {usagePercentage.toFixed(1)}% used
                            </div>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              usagePercentage > 90
                                ? "bg-red-500"
                                : usagePercentage > 75
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(usagePercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Recent Transactions Summary */}
            <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-8 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                  Recent Transactions
                </h3>
                <button
                  onClick={() =>
                    router.push(`/budgets/${String(id)}/transactions`)
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-sm"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {(() => {
                  // Collect all transactions from all categories
                  const allTransactions = (budget.categories ?? []).flatMap(
                    (cat) =>
                      (cat.transactions ?? []).map((transaction) => ({
                        ...transaction,
                        categoryName: cat.category.name,
                        categoryGroup: cat.category.group,
                      })),
                  );

                  if (allTransactions.length === 0) {
                    return (
                      <div className="py-6 text-center">
                        <p className="text-sm text-gray-500">
                          No transactions yet
                        </p>
                        <button
                          onClick={() => setIsAddTransactionOpen(true)}
                          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
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

                  return recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {transaction.name ?? "Unnamed Transaction"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {transaction.categoryName}
                          </span>
                        </div>
                        {transaction.description && (
                          <p className="mt-1 text-xs text-gray-500">
                            {transaction.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {transaction.occurredAt
                            ? new Date(
                                transaction.occurredAt,
                              ).toLocaleDateString()
                            : new Date(
                                transaction.createdAt,
                              ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-semibold ${
                            transaction.transactionType ===
                            TransactionType.RETURN
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.transactionType ===
                          TransactionType.RETURN
                            ? "+"
                            : "-"}
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                        <div className="text-xs capitalize text-gray-500">
                          {transaction.transactionType
                            .toLowerCase()
                            .replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
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
      {isIncomeModalOpen && (
        <IncomeModal
          isOpen={isIncomeModalOpen}
          budgetId={id as string}
          incomes={budget.incomes ?? []}
          onClose={() => setIsIncomeModalOpen(false)}
          onSuccess={handleIncomeSuccess}
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
    </div>
  );
};

export default BudgetDetailsPage;
