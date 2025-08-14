"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/lib/utils/hooks";

interface BudgetCategoriesSearchProps {
  onSearchChange: (searchQuery: string) => void;
  searchQuery: string;
}

export default function BudgetCategoriesSearch({
  onSearchChange,
  searchQuery,
}: BudgetCategoriesSearchProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce the search to avoid too many API calls
  const debouncedSearch = useDebounce(localSearchQuery, 300);

  // Update parent when debounced search changes
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const clearSearch = () => {
    setLocalSearchQuery("");
    onSearchChange("");
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories, amounts, transactions..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {localSearchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
