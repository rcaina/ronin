"use client";

import { Grid3X3, List } from "lucide-react";

export type BudgetCategoriesViewType = "grid" | "list";

interface BudgetCategoriesViewToggleProps {
  view: BudgetCategoriesViewType;
  onViewChange: (view: BudgetCategoriesViewType) => void;
}

export default function BudgetCategoriesViewToggle({
  view,
  onViewChange,
}: BudgetCategoriesViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border bg-white p-1 shadow-sm">
      <button
        onClick={() => onViewChange("grid")}
        className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "grid"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
        title="Grid view"
      >
        <Grid3X3 className="h-4 w-4" />
        <span>Grid</span>
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "list"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
        title="List view"
      >
        <List className="h-4 w-4" />
        <span>List</span>
      </button>
    </div>
  );
}
