"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import BudgetCategoryCard from "@/components/budgets/BudgetCategoryCard";
import BudgetTransactionsList from "@/components/budgets/BudgetTransactionsList";
import AddBudgetCategoryForm from "@/components/budgets/AddBudgetCategoryForm";
import {
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import { useState, useRef, useEffect } from "react";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [scrollShadows, setScrollShadows] = useState<Record<string, boolean>>(
    {},
  );
  const { data: budget, isLoading, error, refetch } = useBudget(id as string);
  const { data: categories } = useCategories();
  const createBudgetCategoryMutation = useCreateBudgetCategory();
  const updateBudgetCategoryMutation = useUpdateBudgetCategory();
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Check if content is scrollable and show/hide shadow accordingly
  useEffect(() => {
    const checkScrollable = () => {
      const newScrollShadows: Record<string, boolean> = {};

      Object.entries(scrollContainerRefs.current).forEach(
        ([group, element]) => {
          if (element) {
            const isScrollable = element.scrollHeight > element.clientHeight;
            newScrollShadows[group] = isScrollable;
          }
        },
      );

      setScrollShadows(newScrollShadows);
    };

    checkScrollable();

    // Re-check when budget categories change
    const resizeObserver = new ResizeObserver(checkScrollable);
    Object.values(scrollContainerRefs.current).forEach((element) => {
      if (element) {
        resizeObserver.observe(element);
      }
    });

    return () => resizeObserver.disconnect();
  }, [budget?.categories]);

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

  const handleStartAddCategory = (group: string) => {
    setIsAddingCategory(true);
    setActiveGroup(group);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setActiveGroup(null);
  };

  const handleSubmitAddCategory = async (data: {
    categoryName: string;
    allocatedAmount: number;
  }) => {
    try {
      await createBudgetCategoryMutation.mutateAsync({
        budgetId: id as string,
        data: {
          categoryName: data.categoryName,
          group: activeGroup as "needs" | "wants" | "investment",
          allocatedAmount: data.allocatedAmount,
        },
      });

      handleCancelAddCategory();
    } catch (error) {
      console.error("Failed to add budget category:", error);
    }
  };

  // Drag and drop handlers for budget categories
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add(
      "bg-gray-50",
      "border-2",
      "border-dashed",
      "border-gray-300",
    );
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove(
      "bg-gray-50",
      "border-2",
      "border-dashed",
      "border-gray-300",
    );
  };

  const handleDrop = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove(
      "bg-gray-50",
      "border-2",
      "border-dashed",
      "border-gray-300",
    );

    const budgetCategoryId = e.dataTransfer.getData("text/plain");
    if (!budgetCategoryId || !categories) return;

    // Find the budget category being dragged
    const draggedBudgetCategory = (budget.categories ?? []).find(
      (bc) => bc.id === budgetCategoryId,
    );
    if (!draggedBudgetCategory?.category) return;

    // Don't allow dropping in the same group
    if (draggedBudgetCategory.category.group.toLowerCase() === targetGroup) {
      return;
    }

    // Find a category template in the target group with the same name
    const targetGroupKey = targetGroup as keyof typeof categories;
    const targetCategories = categories[targetGroupKey] || [];

    const matchingCategory = targetCategories.find(
      (cat) => cat.name === draggedBudgetCategory.category.name,
    );

    if (!matchingCategory) {
      console.error("No matching category found in target group");
      return;
    }

    try {
      // Update the budget category to use the new category template
      await updateBudgetCategoryMutation.mutateAsync({
        budgetId: id as string,
        categoryId: budgetCategoryId,
        data: {
          categoryId: matchingCategory.id,
        },
      });
    } catch (error) {
      console.error("Failed to move budget category:", error);
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
        action={{
          icon: <Plus className="h-4 w-4" />,
          label: "Add Transaction",
          onClick: () => {
            setIsAddTransactionOpen(true);
          },
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
          <div className="mb-8">
            <div className="mb-4 flex items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Budget Categories
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(categoriesByGroup).map(([group, categories]) => (
                <div
                  key={group}
                  className="flex h-[600px] flex-col"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, group)}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="mb-4 flex items-center">
                      <div
                        className={`h-3 w-3 rounded-full ${getGroupColor(group)} mr-3`}
                      ></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getGroupLabel(group)}
                      </h3>
                      <span className="ml-2 text-sm text-gray-500">
                        ({categories?.length})
                      </span>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => handleStartAddCategory(group)}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="Add category"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="relative min-h-0 flex-1">
                    <div
                      ref={(el) => {
                        scrollContainerRefs.current[group] = el;
                      }}
                      className="scrollbar-hide absolute inset-0 space-y-4 overflow-y-auto pb-6"
                    >
                      {/* Add Category Form - inline within column */}
                      {isAddingCategory && activeGroup === group && (
                        <AddBudgetCategoryForm
                          onSubmit={handleSubmitAddCategory}
                          onCancel={handleCancelAddCategory}
                          isLoading={createBudgetCategoryMutation.isPending}
                          group={group}
                        />
                      )}

                      {categories?.map((budgetCategory) => {
                        // Skip if category relation is not loaded
                        if (!budgetCategory.category) return null;

                        return (
                          <BudgetCategoryCard
                            key={budgetCategory.id}
                            budgetCategory={budgetCategory}
                            budgetId={id as string}
                            getGroupColor={getGroupColor}
                          />
                        );
                      })}
                    </div>

                    {/* Scroll Shadow Indicator */}
                    {scrollShadows[group] && (
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Transactions */}
          <BudgetTransactionsList
            transactions={(budget.categories ?? [])
              .filter((budgetCategory) => budgetCategory.category)
              .flatMap((budgetCategory) =>
                (budgetCategory.transactions ?? []).map((transaction) => ({
                  ...transaction,
                  categoryName: budgetCategory.category.name,
                  categoryGroup: budgetCategory.category.group,
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
    </div>
  );
};

export default BudgetDetailsPage;
