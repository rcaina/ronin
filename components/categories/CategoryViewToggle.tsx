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
    <div className="inline-flex items-center rounded-full bg-surface-muted p-1">
      <button
        onClick={() => onViewChange("grid")}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
          view === "grid"
            ? "bg-white text-gray-900 shadow-soft"
            : "text-gray-500 hover:text-gray-700"
        }`}
        title="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
          view === "list"
            ? "bg-white text-gray-900 shadow-soft"
            : "text-gray-500 hover:text-gray-700"
        }`}
        title="List view"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
