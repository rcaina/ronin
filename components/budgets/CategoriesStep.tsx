"use client";

import { DollarSign, ShoppingBag, TrendingUp, Target } from "lucide-react";
import { CategoryType } from "@prisma/client";
import type { CategoryAllocation } from "./types";
import type { GroupedCategories } from "@/lib/data-hooks/services/categories";

interface CategoriesStepProps {
  categories: GroupedCategories | undefined;
  categoriesLoading: boolean;
  selectedCategories: CategoryAllocation[];
  onCategoryToggle: (categoryId: string) => void;
}

export default function CategoriesStep({
  categories,
  categoriesLoading,
  selectedCategories,
  onCategoryToggle,
}: CategoriesStepProps) {
  const getCategoryGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-red-100 text-red-800 border-red-200";
      case CategoryType.WANTS:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case CategoryType.INVESTMENT:
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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

  return (
    <div className="space-y-6">
      {categoriesLoading ? (
        <div className="py-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-secondary"></div>
          <p className="mt-2 text-sm text-gray-500">Loading categories...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories && (
            <>
              {/* Wants */}
              {categories.wants.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold capitalize text-gray-900">
                    wants
                  </h3>
                  <div className="grid gap-3">
                    {categories.wants.map((category) => (
                      <div
                        key={category.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-colors hover:bg-gray-50"
                        onClick={() => onCategoryToggle(category.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={
                              selectedCategories.find(
                                (c) => c.categoryId === category.id,
                              )?.isSelected ?? false
                            }
                            onChange={() => onCategoryToggle(category.id)}
                            className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                          />
                          <div className="flex items-center space-x-2">
                            {getCategoryGroupIcon(category.group)}
                            <span className="font-medium text-gray-900">
                              {category.name}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${getCategoryGroupColor(
                            category.group,
                          )}`}
                        >
                          {category.group}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Needs */}
              {categories.needs.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold capitalize text-gray-900">
                    needs
                  </h3>
                  <div className="grid gap-3">
                    {categories.needs.map((category) => (
                      <div
                        key={category.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-colors hover:bg-gray-50"
                        onClick={() => onCategoryToggle(category.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={
                              selectedCategories.find(
                                (c) => c.categoryId === category.id,
                              )?.isSelected ?? false
                            }
                            onChange={() => onCategoryToggle(category.id)}
                            className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                          />
                          <div className="flex items-center space-x-2">
                            {getCategoryGroupIcon(category.group)}
                            <span className="font-medium text-gray-900">
                              {category.name}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${getCategoryGroupColor(
                            category.group,
                          )}`}
                        >
                          {category.group}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Investment */}
              {categories.investment.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold capitalize text-gray-900">
                    investment
                  </h3>
                  <div className="grid gap-3">
                    {categories.investment.map((category) => (
                      <div
                        key={category.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-colors hover:bg-gray-50"
                        onClick={() => onCategoryToggle(category.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={
                              selectedCategories.find(
                                (c) => c.categoryId === category.id,
                              )?.isSelected ?? false
                            }
                            onChange={() => onCategoryToggle(category.id)}
                            className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                          />
                          <div className="flex items-center space-x-2">
                            {getCategoryGroupIcon(category.group)}
                            <span className="font-medium text-gray-900">
                              {category.name}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${getCategoryGroupColor(
                            category.group,
                          )}`}
                        >
                          {category.group}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="text-sm text-gray-500">
        Selected {selectedCategories.filter((c) => c.isSelected).length} of{" "}
        {selectedCategories.length} categories
      </div>
    </div>
  );
}
