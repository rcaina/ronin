"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, ShoppingBag, TrendingUp, Target } from "lucide-react";
import { CategoryType } from "@prisma/client";
import { useUpdateBudget } from "@/lib/data-hooks/budgets/useBudgets";
import type { BudgetWithRelations } from "@/lib/types/budget";

interface EditBudgetCategoriesModalProps {
  isOpen: boolean;
  budget: BudgetWithRelations | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CategoryAllocation {
  categoryId: string;
  name: string;
  group: CategoryType;
  allocatedAmount: number;
  currentSpent: number;
}

export default function EditBudgetCategoriesModal({
  isOpen,
  budget,
  onClose,
  onSuccess,
}: EditBudgetCategoriesModalProps) {
  const updateBudgetMutation = useUpdateBudget();
  const [categoryAllocations, setCategoryAllocations] = useState<
    CategoryAllocation[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize category allocations when budget changes
  useEffect(() => {
    if (budget && budget.categories) {
      const allocations: CategoryAllocation[] = budget.categories
        .map((budgetCategory) => {
          if (!budgetCategory.category) return null;

          const currentSpent = (budgetCategory.transactions ?? []).reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
          );

          return {
            categoryId: budgetCategory.categoryId,
            name: budgetCategory.category.name,
            group: budgetCategory.category.group as CategoryType,
            allocatedAmount: budgetCategory.allocatedAmount,
            currentSpent,
          };
        })
        .filter(Boolean) as CategoryAllocation[];

      setCategoryAllocations(allocations);
    }
  }, [budget]);

  const getCategoryGroupIcon = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return <DollarSign className="h-4 w-4" />;
      case CategoryType.WANTS:
        return <ShoppingBag className="h-4 w-4" />;
      case CategoryType.INVESTMENT:
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-blue-500";
      case CategoryType.WANTS:
        return "bg-purple-500";
      case CategoryType.INVESTMENT:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGroupLabel = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "Needs";
      case CategoryType.WANTS:
        return "Wants";
      case CategoryType.INVESTMENT:
        return "Investment";
      default:
        return group;
    }
  };

  const handleAllocationChange = (categoryId: string, amount: number) => {
    setCategoryAllocations((prev) =>
      prev.map((cat) =>
        cat.categoryId === categoryId
          ? { ...cat, allocatedAmount: amount }
          : cat,
      ),
    );
  };

  const calculateTotals = () => {
    const totalIncome = (budget?.incomes ?? []).reduce(
      (sum, income) => sum + income.amount,
      0,
    );
    const totalAllocated = categoryAllocations.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );
    const totalSpent = categoryAllocations.reduce(
      (sum, cat) => sum + cat.currentSpent,
      0,
    );
    const remaining = totalIncome - totalAllocated;

    return {
      totalIncome,
      totalAllocated,
      totalSpent,
      remaining,
    };
  };

  const handleSubmit = async () => {
    if (!budget) return;

    setIsSubmitting(true);
    try {
      const categoryAllocationsMap: Record<string, number> = {};
      categoryAllocations.forEach((cat) => {
        categoryAllocationsMap[cat.categoryId] = cat.allocatedAmount;
      });

      await updateBudgetMutation.mutateAsync({
        id: budget.id,
        data: {
          categoryAllocations: categoryAllocationsMap,
        },
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update budget categories:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  // Group categories by type
  const categoriesByGroup = categoryAllocations.reduce(
    (acc, category) => {
      const group = category.group.toLowerCase();
      acc[group] ??= [];
      acc[group].push(category);
      return acc;
    },
    {} as Record<string, CategoryAllocation[]>,
  );

  if (!isOpen || !budget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Budget Categories
            </h2>
            <p className="text-sm text-gray-500">
              Update allocated amounts for {budget.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-500">
                Total Income
              </div>
              <div className="text-xl font-bold text-gray-900">
                ${totals.totalIncome.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-500">
                Total Allocated
              </div>
              <div className="text-xl font-bold text-gray-900">
                ${totals.totalAllocated.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-500">
                Total Spent
              </div>
              <div className="text-xl font-bold text-gray-900">
                ${totals.totalSpent.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-500">Remaining</div>
              <div
                className={`text-xl font-bold ${
                  totals.remaining >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ${totals.remaining.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Categories by Group */}
          <div className="space-y-6">
            {Object.entries(categoriesByGroup).map(([group, categories]) => (
              <div key={group} className="space-y-4">
                <div className="flex items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${getGroupColor(
                      group.toUpperCase() as CategoryType,
                    )} mr-3`}
                  ></div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getGroupLabel(group.toUpperCase() as CategoryType)}
                  </h3>
                </div>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center space-x-3">
                        {getCategoryGroupIcon(category.group)}
                        <div>
                          <div className="font-medium text-gray-900">
                            {category.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Spent: ${category.currentSpent.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={category.allocatedAmount}
                          onChange={(e) =>
                            handleAllocationChange(
                              category.categoryId,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Warning if over budget */}
          {totals.remaining < 0 && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center">
                <div className="text-red-400">
                  <Target className="h-5 w-5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Over Budget Warning
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    Your total allocations exceed your income by $
                    {Math.abs(totals.remaining).toLocaleString()}. Consider
                    reducing some allocations.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
