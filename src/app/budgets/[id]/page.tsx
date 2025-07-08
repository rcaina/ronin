"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  EditIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import BudgetCategoriesSection from "@/components/budgets/BudgetCategoriesSection";
import BudgetTransactionsList from "@/components/budgets/BudgetTransactionsList";
import IncomeModal from "@/components/budgets/IncomeModal";
import { useState } from "react";
import EditBudgetModal from "@/components/budgets/EditBudgetModal";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const { data: budget, isLoading, error, refetch } = useBudget(id as string);

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
        const aSpent = (a.transactions ?? []).reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        );
        const bSpent = (b.transactions ?? []).reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        );

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

  const handleTransactionSuccess = () => {
    void refetch();
  };

  const handleIncomeSuccess = () => {
    void refetch();
  };

  const handleEditBudgetSuccess = () => {
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
        action={{
          icon: <Plus className="h-4 w-4" />,
          label: "Add Transaction",
          onClick: () => {
            setIsAddTransactionOpen(true);
          },
        }}
      />

      <div className="flex-1 overflow-x-hidden pt-16 sm:pt-20 lg:pt-0">
        <div className="mx-auto w-full px-2 py-4 sm:max-w-7xl sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Budget Overview Cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="group relative rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Total Income
                </h3>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={() => setIsIncomeModalOpen(true)}
                    className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                    title="Edit income sources"
                  >
                    <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                ${totalIncome.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                {budget.incomes?.length === 1
                  ? (budget.incomes[0]?.source ?? "Primary income")
                  : `${budget.incomes?.length ?? 0} income sources`}
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
                ${totalSpent.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                {spendingPercentage.toFixed(1)}% of budget
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
                className={`text-lg font-bold sm:text-xl lg:text-2xl ${totalRemaining >= 0 ? "text-gray-900" : "text-red-600"}`}
              >
                ${totalRemaining.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                {totalRemaining >= 0 ? "Available" : "Over budget"}
              </div>
            </div>
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

          {/* Categories by Group */}
          <BudgetCategoriesSection
            budget={budget}
            budgetId={id as string}
            categoriesByGroup={categoriesByGroup}
            getGroupColor={getGroupColor}
            getGroupLabel={getGroupLabel}
            onRefetch={refetch}
          />

          {/* All Transactions */}
          <BudgetTransactionsList
            transactions={(budget.categories ?? [])
              .filter((budgetCategory) => budgetCategory.category)
              .flatMap((budgetCategory) =>
                (budgetCategory.transactions ?? []).map((transaction) => ({
                  ...transaction,
                  categoryName: budgetCategory.category.name,
                  categoryGroup: budgetCategory.category.group,
                  budgetId: budget.id,
                  categoryId: budgetCategory.id,
                })),
              )
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )}
            getGroupColor={getGroupColor}
          />
        </div>
      </div>
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        budgetId={id as string}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
      <IncomeModal
        isOpen={isIncomeModalOpen}
        budgetId={id as string}
        incomes={budget.incomes ?? []}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={handleIncomeSuccess}
      />
      <EditBudgetModal
        isOpen={isEditBudgetOpen}
        budget={budget}
        onClose={() => setIsEditBudgetOpen(false)}
        onSuccess={handleEditBudgetSuccess}
      />
    </div>
  );
};

export default BudgetDetailsPage;
