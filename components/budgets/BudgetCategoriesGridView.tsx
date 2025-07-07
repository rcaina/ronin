"use client";

import { Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import BudgetCategoryCard from "./BudgetCategoryCard";
import AddBudgetCategoryForm from "./AddBudgetCategoryForm";
import {
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import type {
  BudgetWithRelations,
  CategoriesByGroup,
  GroupColorFunction,
  GroupLabelFunction,
  BudgetCategoryWithRelations,
} from "@/lib/types/budget";
import type { GroupedCategories } from "@/lib/data-hooks/services/categories";

interface BudgetCategoriesGridViewProps {
  budget: BudgetWithRelations;
  budgetId: string;
  categoriesByGroup: CategoriesByGroup;
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
  onRefetch: () => void;
}

export default function BudgetCategoriesGridView({
  budget,
  budgetId,
  categoriesByGroup,
  getGroupColor,
  getGroupLabel,
  onRefetch,
}: BudgetCategoriesGridViewProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [scrollShadows, setScrollShadows] = useState<Record<string, boolean>>(
    {},
  );
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
        budgetId,
        data: {
          categoryName: data.categoryName,
          group: activeGroup as "needs" | "wants" | "investment",
          allocatedAmount: data.allocatedAmount,
        },
      });

      handleCancelAddCategory();
      onRefetch();
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
      (bc: BudgetCategoryWithRelations) => bc.id === budgetCategoryId,
    );
    if (!draggedBudgetCategory?.category) return;

    // Don't allow dropping in the same group
    if (draggedBudgetCategory.category.group.toLowerCase() === targetGroup) {
      return;
    }

    // Find a category template in the target group with the same name
    const targetGroupKey = targetGroup as keyof GroupedCategories;
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
        budgetId,
        categoryId: budgetCategoryId,
        data: {
          categoryId: matchingCategory.id,
        },
      });
      onRefetch();
    } catch (error) {
      console.error("Failed to move budget category:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(categoriesByGroup).map(([group, categories]) => (
        <div
          key={group}
          className="flex h-[400px] flex-col sm:h-[500px] md:h-[600px]"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, group)}
        >
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full ${getGroupColor(group)} mr-2 sm:mr-3`}
              ></div>
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
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
                />
              )}

              {categories?.map(
                (budgetCategory: BudgetCategoryWithRelations) => {
                  // Skip if category relation is not loaded
                  if (!budgetCategory.category) return null;

                  return (
                    <BudgetCategoryCard
                      key={budgetCategory.id}
                      budgetCategory={budgetCategory}
                      budgetId={budgetId}
                      getGroupColor={getGroupColor}
                    />
                  );
                },
              )}
            </div>

            {/* Scroll Shadow Indicator */}
            {scrollShadows[group] && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
