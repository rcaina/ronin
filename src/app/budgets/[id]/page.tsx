"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  EditIcon,
  Info,
  Plus,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import { useState, useEffect } from "react";
import EditBudgetModal from "@/components/budgets/EditBudgetModal";
import StatsCard from "@/components/StatsCard";
import { type CategoryType, TransactionType } from "@prisma/client";
import IncomeModal from "@/components/budgets/IncomeModal";
import {
  formatDateUTC,
  getCategoryBadgeColor,
  getGroupColor,
  roundToCents,
} from "@/lib/utils";
import { useBudgetHeader } from "./BudgetHeaderContext";

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
  const { setActions } = useBudgetHeader();

  // Register header actions
  useEffect(() => {
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add Transaction",
        onClick: () => setIsAddTransactionOpen(true),
        variant: "primary" as const,
      },
      {
        icon: <DollarSign className="h-4 w-4" />,
        label: "Pay Credit Card",
        onClick: () => setIsCardPaymentOpen(true),
        variant: "secondary" as const,
      },
    ]);
  }, [setActions]);

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

  // Get budget status display
  const getBudgetStatusDisplay = () => {
    switch (budget.status) {
      case "ACTIVE":
        return {
          status: "Active",
          color: "text-green-600",
          bg: "bg-green-50",
          subtitle: "Budget is active",
        };
      case "COMPLETED":
        return {
          status: "Completed",
          color: "text-blue-600",
          bg: "bg-blue-50",
          subtitle: "Budget period finished",
        };
      case "ARCHIVED":
        return {
          status: "Archived",
          color: "text-gray-600",
          bg: "bg-gray-50",
          subtitle: "Budget is archived",
        };
      default:
        return {
          status: "Unknown",
          color: "text-gray-600",
          bg: "bg-gray-50",
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

  const handleIncomeSuccess = () => {
    void refetch();
  };

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
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
              title="Status"
              value={budgetStatusDisplay.status}
              subtitle={budgetStatusDisplay.subtitle}
              icon={
                <div
                  className={`h-4 w-4 rounded-full ${budgetStatusDisplay.bg} sm:h-5 sm:w-5`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${budgetStatusDisplay.color.replace("text-", "bg-")} m-1 sm:m-1 sm:h-3 sm:w-3`}
                  ></div>
                </div>
              }
              iconColor={budgetStatusDisplay.color}
              valueColor={budgetStatusDisplay.color}
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
                  spendingPercentage === 100
                    ? "bg-green-500"
                    : spendingPercentage > 100
                      ? "bg-red-500"
                      : "bg-secondary"
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
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
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
                  {formatDateUTC(new Date(budget.startAt).toISOString())}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 sm:text-sm">
                  End Date:
                </span>
                <p className="text-sm font-medium sm:text-base">
                  {formatDateUTC(new Date(budget.endAt).toISOString())}
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
                onClick={() => router.push(`/budgets/${String(id)}/categories`)}
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
                  const totalAllocated = roundToCents(
                    categories.reduce(
                      (sum, cat) => sum + (cat.allocatedAmount ?? 0),
                      0,
                    ),
                  );

                  const totalSpent = roundToCents(
                    categories.reduce((sum, cat) => {
                      const categorySpent = roundToCents(
                        (cat.transactions ?? []).reduce(
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
                        ),
                      );
                      return sum + categorySpent;
                    }, 0),
                  );

                  const usagePercentage = roundToCents(
                    totalAllocated > 0
                      ? (totalSpent / totalAllocated) * 100
                      : 0,
                  );

                  // Count categories that are 100% used
                  const fullyUsedCount = categories.filter((cat) => {
                    const categorySpent = roundToCents(
                      (cat.transactions ?? []).reduce(
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
                      ),
                    );
                    const categoryPercentage = roundToCents(
                      cat.allocatedAmount && cat.allocatedAmount > 0
                        ? (categorySpent / cat.allocatedAmount) * 100
                        : 0,
                    );
                    return categoryPercentage >= 100;
                  }).length;

                  return (
                    <div key={group} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`h-3 w-3 rounded-full ${getGroupColor(group as CategoryType)}`}
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
                      categoryName: cat.name,
                      categoryGroup: cat.group,
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
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            transaction.transactionType ===
                            TransactionType.CARD_PAYMENT
                              ? "bg-gray-200 text-gray-500"
                              : transaction.categoryName
                                ? getCategoryBadgeColor(
                                    transaction.categoryGroup,
                                  )
                                : getCategoryBadgeColor()
                          }`}
                        >
                          {transaction.transactionType ===
                          TransactionType.CARD_PAYMENT
                            ? "Card Payment"
                            : (transaction.categoryName ?? "No Category")}
                        </span>
                        {transaction.description && (
                          <div className="group relative flex-shrink-0">
                            <Info className="h-4 w-4 cursor-help text-gray-400" />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              {transaction.description}
                              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {transaction.occurredAt
                          ? formatDateUTC(
                              new Date(transaction.occurredAt).toISOString(),
                            )
                          : formatDateUTC(
                              new Date(transaction.createdAt).toISOString(),
                            )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          transaction.transactionType === TransactionType.RETURN
                            ? "text-green-600"
                            : ""
                        }`}
                      >
                        {transaction.transactionType === TransactionType.RETURN
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
                ));
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
      {isIncomeModalOpen && (
        <IncomeModal
          isOpen={isIncomeModalOpen}
          budgetId={id as string}
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
    </>
  );
};

export default BudgetDetailsPage;
