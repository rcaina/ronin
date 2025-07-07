"use client";

import { useState } from "react";
import BudgetCategoriesViewToggle from "./BudgetCategoriesViewToggle";
import type { BudgetCategoriesViewType } from "./BudgetCategoriesViewToggle";
import BudgetCategoriesGridView from "./BudgetCategoriesGridView";
import BudgetCategoriesListView from "./BudgetCategoriesListView";
import type {
  BudgetWithRelations,
  CategoriesByGroup,
  GroupColorFunction,
  GroupLabelFunction,
} from "@/lib/types/budget";

interface BudgetCategoriesSectionProps {
  budget: BudgetWithRelations;
  budgetId: string;
  categoriesByGroup: CategoriesByGroup;
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
  onRefetch: () => void;
}

export default function BudgetCategoriesSection({
  budget,
  budgetId,
  categoriesByGroup,
  getGroupColor,
  getGroupLabel,
  onRefetch,
}: BudgetCategoriesSectionProps) {
  const [view, setView] = useState<BudgetCategoriesViewType>("grid");

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Budget Categories</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {(() => {
              const totalIncome = (budget.incomes ?? []).reduce(
                (sum: number, income) => sum + income.amount,
                0,
              );
              const totalAllocated = (budget.categories ?? []).reduce(
                (sum: number, category) => sum + category.allocatedAmount,
                0,
              );
              const allocationRemaining = totalIncome - totalAllocated;

              if (allocationRemaining > 0) {
                return (
                  <span className="text-sm font-medium text-blue-600">
                    ${allocationRemaining.toLocaleString()} Left to Allocate
                  </span>
                );
              } else if (allocationRemaining === 0) {
                return (
                  <span className="text-sm font-medium text-green-600">
                    100% Allocated
                  </span>
                );
              } else {
                return (
                  <span className="text-sm font-medium text-red-600">
                    ${Math.abs(allocationRemaining).toLocaleString()} Over
                    Allocated
                  </span>
                );
              }
            })()}
          </div>
          <BudgetCategoriesViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {view === "grid" ? (
        <BudgetCategoriesGridView
          budget={budget}
          budgetId={budgetId}
          categoriesByGroup={categoriesByGroup}
          getGroupColor={getGroupColor}
          getGroupLabel={getGroupLabel}
          onRefetch={onRefetch}
        />
      ) : (
        <BudgetCategoriesListView
          budget={budget}
          budgetId={budgetId}
          categoriesByGroup={categoriesByGroup}
          getGroupColor={getGroupColor}
          getGroupLabel={getGroupLabel}
        />
      )}
    </div>
  );
}
