"use client";

import { LayoutGrid, List } from "lucide-react";

export type CategoryViewType = "grid" | "list";

interface CategoryViewToggleProps {
  view: CategoryViewType;
  onViewChange: (view: CategoryViewType) => void;
}

export default function CategoryViewToggle({
  view,
  onViewChange,
}: CategoryViewToggleProps) {
  return (
    <div className="flex items-center space-x-1 rounded-lg border border-gray-300 bg-white p-1">
      <button
        onClick={() => onViewChange("grid")}
        className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          view === "grid"
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-50"
        }`}
        title="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          view === "list"
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-50"
        }`}
        title="List view"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
