"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useState } from "react";
import BudgetCategoriesGridView from "@/components/budgets/BudgetCategoriesGridView";
import BudgetCategoriesViewToggle, {
  type BudgetCategoriesViewType,
} from "@/components/budgets/BudgetCategoriesViewToggle";
import BudgetCategoriesListView from "@/components/budgets/BudgetCategoriesListView";
import { CategoryType } from "@prisma/client";

const BudgetCategoriesPage = () => {
  const { id } = useParams();
  const budgetId = id as string;
  const [view, setView] = useState<BudgetCategoriesViewType>("grid");

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

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Budget Categories"
        description="Manage your budget categories"
      />

      <div className="flex-1 overflow-hidden pt-16 sm:pt-24 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                <BudgetCategoriesViewToggle
                  view={view}
                  onViewChange={setView}
                />
              </div>
            </div>

            {view === "grid" ? (
              <BudgetCategoriesGridView
                budgetId={budgetId}
                getGroupColor={getGroupColor}
                getGroupLabel={getGroupLabel}
              />
            ) : (
              <BudgetCategoriesListView
                budgetId={budgetId}
                getGroupColor={getGroupColor}
                getGroupLabel={getGroupLabel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetCategoriesPage;
