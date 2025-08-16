"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Info, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import AddBudgetCategoryForm from "./AddBudgetCategoryForm";
import {
  useBudgetCategories,
  useCreateBudgetCategory,
  type BudgetCategoryWithCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import type {
  CategoriesByGroup,
  GroupColorFunction,
  GroupLabelFunction,
} from "@/lib/types/budget";
import { TransactionType, CategoryType } from "@prisma/client";

interface BudgetCategoriesListViewProps {
  budgetId: string;
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
  budgetCategories?: BudgetCategoryWithCategory[];
}

export default function BudgetCategoriesListView({
  budgetId,
  getGroupColor,
  getGroupLabel,
  budgetCategories: propBudgetCategories,
}: BudgetCategoriesListViewProps) {
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<CategoryType | null>(null);
  const createBudgetCategoryMutation = useCreateBudgetCategory();

  // Define the three main category groups using the enum values
  const mainGroups = Object.values(CategoryType);

  // Use prop data if provided, otherwise fall back to hook data
  const { data: hookBudgetCategories } = useBudgetCategories(budgetId);
  const budgetCategories = propBudgetCategories ?? hookBudgetCategories;

  // Ensure all main groups are present in categoriesByGroup, even if empty
  const displayCategoriesByGroup = mainGroups.reduce((acc, group) => {
    acc[group] =
      budgetCategories?.filter(
        (category: BudgetCategoryWithCategory) =>
          category.category.group === group,
      ) ?? [];
    return acc;
  }, {} as CategoriesByGroup);

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleStartAddCategory = (group: CategoryType) => {
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
        budgetId,
        data: {
          categoryName: data.categoryName,
          group: activeGroup!,
          allocatedAmount: data.allocatedAmount,
        },
      });

      handleCancelAddCategory();
      toast.success("Budget category added successfully!");
    } catch (error) {
      console.error("Failed to add budget category:", error);
      toast.error("Failed to add budget category. Please try again.");
    }
  };

  const handleViewAllTransactions = (categoryId: string) => {
    router.push(`/budgets/${budgetId}/transactions?category=${categoryId}`);
  };

  return (
    <div className="h-full w-full">
      <div className="space-y-2 pr-2">
        {Object.entries(displayCategoriesByGroup).map(([group, categories]) => (
          <div key={group} className="space-y-2">
            {/* Group Header */}
            <div
              className={`flex items-center justify-between rounded-lg p-3 text-white sm:p-4 ${getGroupColor(group as CategoryType)}`}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="h-3 w-3 rounded-full bg-white/20"></div>
                <h3 className="font-medium text-white">
                  {getGroupLabel(group as CategoryType)}
                </h3>
                <span className="text-sm text-white/80">
                  ({categories?.length || 0})
                </span>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => handleStartAddCategory(group as CategoryType)}
                  className="rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  title="Add category to this group"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add Category Form - inline within group */}
            {isAddingCategory && activeGroup === group && (
              <div className="ml-4 sm:ml-8">
                <AddBudgetCategoryForm
                  onSubmit={handleSubmitAddCategory}
                  onCancel={handleCancelAddCategory}
                  isLoading={createBudgetCategoryMutation.isPending}
                />
              </div>
            )}

            {/* Categories in this group */}
            {categories && categories.length > 0 ? (
              categories.map((budgetCategory) => {
                // Skip if category relation is not loaded
                if (!budgetCategory.category) return null;

                const isExpanded = expandedCategories.has(budgetCategory.id);
                const transactions = budgetCategory.transactions ?? [];
                const spent = transactions.reduce(
                  (sum: number, transaction) => {
                    if (
                      transaction.transactionType === TransactionType.RETURN
                    ) {
                      // Returns reduce spending (positive amount = refund received)
                      return sum - transaction.amount;
                    } else {
                      // Regular transactions: positive = purchases (increase spending)
                      return sum + transaction.amount;
                    }
                  },
                  0,
                );
                const percentage =
                  budgetCategory.allocatedAmount > 0
                    ? (spent / budgetCategory.allocatedAmount) * 100
                    : 0;

                return (
                  <div key={budgetCategory.id} className="space-y-2">
                    {/* Category Row */}
                    <div
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 sm:p-4"
                      onClick={() => toggleExpanded(budgetCategory.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div
                            className={`h-3 w-3 rounded-full ${getGroupColor(
                              group as CategoryType,
                            )}`}
                          ></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:space-x-2">
                              <p className="font-medium text-gray-900">
                                {budgetCategory.category.name}
                              </p>
                              <span className="text-sm text-gray-500">
                                ({getGroupLabel(group as CategoryType)})
                              </span>
                            </div>
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:space-x-4">
                                <span>
                                  Allocated: $
                                  {budgetCategory.allocatedAmount.toLocaleString()}
                                </span>
                                <span>Spent: ${spent.toLocaleString()}</span>
                                <span
                                  className={
                                    budgetCategory.allocatedAmount - spent >= 0
                                      ? "text-gray-500"
                                      : "text-red-500"
                                  }
                                >
                                  Remaining: $
                                  {(
                                    budgetCategory.allocatedAmount - spent
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-200">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    percentage === 100
                                      ? "bg-green-500"
                                      : percentage > 100
                                        ? "bg-red-500"
                                        : "bg-secondary"
                                  }`}
                                  style={{
                                    width: `${percentage > 100 ? 100 : percentage}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex items-center space-x-2 sm:space-x-4">
                        <div className="text-right">
                          <p
                            className={`font-medium ${
                              spent > budgetCategory.allocatedAmount
                                ? "text-red-600"
                                : "text-gray-900"
                            }`}
                          >
                            ${spent.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            of $
                            {budgetCategory.allocatedAmount.toLocaleString()}
                          </p>
                        </div>
                        {transactions.length > 0 && (
                          <div className="flex items-center">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Transactions */}
                    {isExpanded && (
                      <div className="ml-4 space-y-2 sm:ml-8">
                        {transactions.length === 0 ? (
                          <div className="bg-gray-25 rounded-lg p-3 text-center text-sm text-gray-500 sm:p-4">
                            No transactions in this category
                          </div>
                        ) : (
                          <>
                            {transactions.slice(0, 3).map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-2 sm:p-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <p className="truncate font-medium text-gray-900">
                                      {transaction.name ??
                                        "Unnamed transaction"}
                                    </p>
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
                                  <p className="truncate text-sm text-gray-500">
                                    {new Date(
                                      transaction.createdAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="ml-2 flex-shrink-0 text-right">
                                  <p className="font-medium text-gray-900">
                                    ${transaction.amount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {transactions.length > 3 && (
                              <button
                                onClick={() =>
                                  handleViewAllTransactions(
                                    budgetCategory.category.id,
                                  )
                                }
                                className="w-full cursor-pointer rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-xs text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 hover:underline"
                                title={`View all ${transactions.length} transactions for ${budgetCategory.category.name}`}
                              >
                                +{transactions.length - 3} more transactions
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Empty state for group with no categories */
              <div className="ml-4 rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-500 sm:ml-8 sm:p-4">
                <p>No categories in this group yet</p>
                <p>Click the + button above to add one</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
