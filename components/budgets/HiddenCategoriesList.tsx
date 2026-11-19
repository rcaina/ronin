"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "@/components/Button";
import { useUpdateBudgetCategory } from "@/lib/data-hooks/budgets/useBudgetCategories";
import type { BudgetCategoryWithCategory } from "@/lib/types/budget";
import {
  formatMonthLabel,
  toMonthKey,
  type MonthKey,
} from "@/lib/utils/budget-month";

interface HiddenCategoriesListProps {
  budgetId: string;
  month: MonthKey;
  categories: BudgetCategoryWithCategory[];
}

/** The month's hidden categories, collapsed under a count, each with an Unhide action. */
export default function HiddenCategoriesList({
  budgetId,
  month,
  categories,
}: HiddenCategoriesListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateCategory = useUpdateBudgetCategory();
  const pendingId = updateCategory.isPending
    ? updateCategory.variables?.categoryId
    : undefined;

  if (categories.length === 0) return null;

  // hiddenFrom arrives as an ISO string over JSON.
  const hiddenLabel = (category: BudgetCategoryWithCategory) => {
    const from = category.hiddenFrom
      ? toMonthKey(new Date(category.hiddenFrom))
      : null;
    return from && from <= month
      ? `Hidden since ${formatMonthLabel(from)}`
      : `Hidden in ${formatMonthLabel(month)}`;
  };

  const unhide = async (category: BudgetCategoryWithCategory) => {
    try {
      await updateCategory.mutateAsync({
        budgetId,
        categoryId: category.id,
        data: { visibility: "show", month },
      });
      toast.success(`${category.name} unhidden`);
    } catch {
      toast.error(`Couldn't unhide ${category.name}. Please try again.`);
    }
  };

  return (
    <div className="card-surface mt-4 lg:flex-shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="tap-target flex w-full items-center justify-start gap-2 px-4 py-3 text-sm font-semibold text-gray-900"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        Hidden ({categories.length})
      </button>
      {isOpen && (
        <ul className="divide-y divide-gray-200/70 border-t border-gray-200/70 lg:max-h-64 lg:overflow-y-auto">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 px-4 py-2"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-gray-900">
                  {category.name}
                </p>
                <p className="text-xs text-gray-500">{hiddenLabel(category)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void unhide(category)}
                disabled={updateCategory.isPending}
                isLoading={pendingId === category.id}
                className="tap-target flex-shrink-0 gap-1.5"
              >
                <Eye className="h-4 w-4" />
                Unhide
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
