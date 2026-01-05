"use client";

import { Plus, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import BudgetCategoryCard from "./BudgetCategoryCard";
import AddBudgetCategoryForm from "./AddBudgetCategoryForm";
import {
  useBudgetCategories,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  type BudgetCategoryWithCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import type {
  CategoriesByGroup,
  GroupColorFunction,
  GroupLabelFunction,
} from "@/lib/types/budget";
import { CategoryType } from "@prisma/client";

interface BudgetCategoriesGridViewProps {
  budgetId: string;
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
  budgetCategories?: BudgetCategoryWithCategory[];
}

export default function BudgetCategoriesGridView({
  budgetId,
  getGroupColor,
  getGroupLabel,
  budgetCategories: propBudgetCategories,
}: BudgetCategoriesGridViewProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<CategoryType | null>(null);
  const [scrollShadows, setScrollShadows] = useState<Record<string, boolean>>(
    {},
  );
  // Track which groups are expanded/collapsed (for mobile accordion)
  const [expandedGroups, setExpandedGroups] = useState<Set<CategoryType>>(
    new Set(Object.values(CategoryType)), // All groups expanded by default
  );
  const [isMobile, setIsMobile] = useState(false);
  const { data: categories } = useCategories();
  const createBudgetCategoryMutation = useCreateBudgetCategory();
  const updateBudgetCategoryMutation = useUpdateBudgetCategory();
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Use prop data if provided, otherwise fall back to hook data
  const { data: hookBudgetCategories } = useBudgetCategories(budgetId);
  const budgetCategories = propBudgetCategories ?? hookBudgetCategories;

  // Define the three main category groups using the enum values
  const mainGroups = Object.values(CategoryType);

  const categoriesByGroup = useMemo(() => {
    return budgetCategories?.reduce(
      (acc, category: BudgetCategoryWithCategory) => {
        const groupKey = category.group;
        acc[groupKey] = [...(acc[groupKey] ?? []), category];
        return acc;
      },
      {} as CategoriesByGroup,
    );
  }, [budgetCategories]);

  // Ensure all main groups are present in categoriesByGroup, even if empty
  const displayCategoriesByGroup = mainGroups.reduce((acc, group) => {
    acc[group] = categoriesByGroup?.[group] ?? [];
    return acc;
  }, {} as CategoriesByGroup);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
  }, [budgetCategories]);

  const handleStartAddCategory = (group: CategoryType) => {
    setIsAddingCategory(true);
    setActiveGroup(group);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setActiveGroup(null);
  };

  const toggleGroupExpanded = (group: CategoryType) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
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

  const handleDrop = async (e: React.DragEvent, targetGroup: CategoryType) => {
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
    const draggedBudgetCategory = (budgetCategories ?? []).find(
      (bc: BudgetCategoryWithCategory) => bc.id === budgetCategoryId,
    );
    if (!draggedBudgetCategory) return;

    // Don't allow dropping in the same group
    if (draggedBudgetCategory.group === targetGroup) {
      return;
    }

    try {
      // Update the budget category to use the new category template
      await updateBudgetCategoryMutation.mutateAsync({
        budgetId,
        categoryId: budgetCategoryId,
        data: {
          group: targetGroup,
        },
      });
      toast.success("Budget category moved successfully!");
    } catch (error) {
      console.error("Failed to move budget category:", error);
      toast.error("Failed to move budget category. Please try again.");
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {Object.entries(displayCategoriesByGroup).map(([group, categories]) => {
          const groupType = group as CategoryType;
          const isGroupExpanded = expandedGroups.has(groupType);

          return (
            <div
              key={group}
              className="flex h-full min-h-0 flex-col"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, groupType)}
            >
              <div
                className="mb-3 flex items-center justify-between sm:mb-4"
                onClick={() => {
                  // Only toggle on mobile
                  if (isMobile) {
                    toggleGroupExpanded(groupType);
                  }
                }}
              >
                <div
                  className={`flex flex-1 cursor-pointer items-center sm:cursor-default`}
                >
                  {/* Mobile collapse/expand chevron */}
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 sm:hidden ${
                      isGroupExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <div
                    className={`h-3 w-3 rounded-full ${getGroupColor(groupType)} mr-2 sm:mr-3`}
                  ></div>
                  <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                    {getGroupLabel(groupType)}
                  </h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({categories?.length ?? 0})
                  </span>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddCategory(groupType);
                    }}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Add category"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                className={`relative min-h-0 flex-1 overflow-hidden ${!isGroupExpanded ? "hidden sm:block" : ""}`}
              >
                <div
                  ref={(el) => {
                    scrollContainerRefs.current[group] = el;
                  }}
                  className="scrollbar-hide h-full space-y-3 overflow-y-auto pb-4"
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
                    (budgetCategory: BudgetCategoryWithCategory) => {
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

                  {/* Show empty state message when no categories in this group */}
                  {(!categories || categories.length === 0) &&
                    !(isAddingCategory && activeGroup === group) && (
                      <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                        <div className="text-center text-sm text-gray-500">
                          <p>No categories yet</p>
                          <p>Click the + button to add one</p>
                        </div>
                      </div>
                    )}
                </div>

                {/* Scroll Shadow Indicator */}
                {scrollShadows[group] && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
