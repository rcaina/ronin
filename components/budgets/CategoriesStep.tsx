"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  X,
  Check,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Target,
  CheckCircle2,
} from "lucide-react";
import { CategoryType } from "@prisma/client";
import type { CategoryAllocation } from "./types";
import { getCategoryBadgeColor } from "@/lib/utils";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import LoadingSpinner from "@/components/LoadingSpinner";

interface CategoriesStepProps {
  selectedCategories: CategoryAllocation[];
  onAddCategory: (category: { name: string; group: CategoryType }) => void;
  onRemoveCategory: (categoryId: string) => void;
}

export default function CategoriesStep({
  selectedCategories,
  onAddCategory,
  onRemoveCategory,
}: CategoriesStepProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryGroup, setNewCategoryGroup] = useState<CategoryType>(
    CategoryType.WANTS,
  );
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Fetch default categories
  const { data: defaultCategories, isLoading: isLoadingCategories } =
    useCategories();

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

  const getGroupTitleColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "text-red-700";
      case CategoryType.WANTS:
        return "text-blue-700";
      case CategoryType.INVESTMENT:
        return "text-green-700";
      default:
        return "text-gray-700";
    }
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory({
        name: newCategoryName.trim(),
        group: newCategoryGroup,
      });
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const handleCancelAdd = () => {
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const startAddingCategory = (group: CategoryType) => {
    setNewCategoryGroup(group);
    setIsAddingCategory(true);
    setNewCategoryName("");
  };

  // Check if a default category is already selected and get its categoryId
  const getSelectedCategoryId = (name: string, group: CategoryType) => {
    const selected = selectedCategories.find(
      (cat) => cat.name === name && cat.group === group,
    );
    return selected?.categoryId;
  };

  const isDefaultCategorySelected = (name: string, group: CategoryType) => {
    return getSelectedCategoryId(name, group) !== undefined;
  };

  // Handle toggling a default category (add if not selected, remove if selected)
  const handleToggleDefaultCategory = (name: string, group: CategoryType) => {
    const categoryId = getSelectedCategoryId(name, group);
    if (categoryId) {
      // If already selected, remove it
      onRemoveCategory(categoryId);
    } else {
      // If not selected, add it
      onAddCategory({ name, group });
    }
  };

  // Group default categories by type
  const defaultCategoriesByGroup = useMemo(() => {
    if (!defaultCategories) return {};

    return {
      [CategoryType.NEEDS]: defaultCategories.needs || [],
      [CategoryType.WANTS]: defaultCategories.wants || [],
      [CategoryType.INVESTMENT]: defaultCategories.investment || [],
    };
  }, [defaultCategories]);

  // Group selected categories by type
  const categoriesByGroup = selectedCategories.reduce(
    (acc, category) => {
      if (!acc[category.group]) {
        acc[category.group] = [];
      }
      acc[category.group].push(category);
      return acc;
    },
    {} as Record<CategoryType, CategoryAllocation[]>,
  );

  const groupOrder = [
    CategoryType.NEEDS,
    CategoryType.WANTS,
    CategoryType.INVESTMENT,
  ];
  const groupLabels = {
    [CategoryType.NEEDS]: "Needs",
    [CategoryType.WANTS]: "Wants",
    [CategoryType.INVESTMENT]: "Investments",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Budget Categories
        </h3>
        <p className="text-sm text-gray-500">
          Select from default categories or create custom ones to track in your
          budget (optional). You can organize them by needs, wants, or
          investments.
        </p>
      </div>

      {/* Default Categories Section */}
      {isLoadingCategories ? (
        <div className="flex justify-center py-4">
          <LoadingSpinner message="Loading default categories..." />
        </div>
      ) : (
        defaultCategories && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                Default Categories
              </h4>
              <p className="mb-4 text-xs text-gray-500">
                Click on a category to add it to your budget
              </p>
            </div>

            {groupOrder.map((groupType) => {
              const defaultCats = defaultCategoriesByGroup[groupType] ?? [];
              if (defaultCats.length === 0) return null;

              return (
                <div key={`default-${groupType}`} className="space-y-2">
                  <h5
                    className={`text-xs font-medium ${getGroupTitleColor(groupType)}`}
                  >
                    {groupLabels[groupType]} - Default Categories
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {defaultCats.map((defaultCat) => {
                      const isSelected = isDefaultCategorySelected(
                        defaultCat.name,
                        defaultCat.group,
                      );

                      return (
                        <button
                          key={defaultCat.id}
                          type="button"
                          onClick={() =>
                            handleToggleDefaultCategory(
                              defaultCat.name,
                              defaultCat.group,
                            )
                          }
                          className={`flex items-center space-x-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-green-500 bg-green-50 text-green-700 hover:border-green-600 hover:bg-green-100"
                              : "hover:bg-secondary/5 border-gray-200 bg-white text-gray-700 hover:border-secondary hover:text-secondary"
                          }`}
                          title={
                            isSelected
                              ? `Click to remove ${defaultCat.name} from budget`
                              : `Click to add ${defaultCat.name} to budget`
                          }
                        >
                          {getCategoryGroupIcon(defaultCat.group)}
                          <span>{defaultCat.name}</span>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Divider and Selected Categories Header */}
      {defaultCategories &&
        Object.values(defaultCategoriesByGroup).some(
          (group: CategoryAllocation[]) => group.length > 0,
        ) && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              Selected Categories
            </h4>
            <p className="mb-4 text-xs text-gray-500">
              Categories you&apos;ve added to your budget
            </p>
          </div>
        )}

      {/* Selected Categories grouped by type */}
      {groupOrder.map((groupType) => {
        const categories = categoriesByGroup[groupType] || [];
        const isAddingToThisGroup =
          isAddingCategory && newCategoryGroup === groupType;

        return (
          <div key={groupType} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center justify-between">
              <h4
                className={`text-md font-semibold ${getGroupTitleColor(groupType)}`}
              >
                {groupLabels[groupType]}
              </h4>
              <button
                type="button"
                onClick={() => startAddingCategory(groupType)}
                disabled={isAddingCategory}
                className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>

            {/* Inline Add Form - Now at the top */}
            {isAddingToThisGroup && (
              <div className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                  autoFocus
                />
                <select
                  value={newCategoryGroup}
                  onChange={(e) =>
                    setNewCategoryGroup(e.target.value as CategoryType)
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                >
                  <option value={CategoryType.NEEDS}>Needs</option>
                  <option value={CategoryType.WANTS}>Wants</option>
                  <option value={CategoryType.INVESTMENT}>Investment</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  disabled={!newCategoryName.trim()}
                  className="rounded-md bg-green-600 p-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  title="Add category"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="rounded-md border border-red-500 bg-red-500 p-2 text-white transition-colors hover:border-red-600 hover:bg-red-600"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Categories in this group */}
            {categories.map((category) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center space-x-3">
                  {getCategoryGroupIcon(category.group)}
                  <div className="font-medium text-gray-900">
                    {category.name}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${getCategoryBadgeColor(
                      category.group,
                    )}`}
                  >
                    {category.group}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCategory(category.categoryId)}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                  title="Remove category"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Empty state for group */}
            {categories.length === 0 && !isAddingToThisGroup && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                No {groupLabels[groupType].toLowerCase()} categories yet
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      <div className="text-sm text-gray-500">
        {selectedCategories.length === 0
          ? "No categories added (you can add them later from budget settings)"
          : selectedCategories.length === 1
            ? "1 category added to your budget"
            : `${selectedCategories.length} categories added to your budget`}
      </div>
    </div>
  );
}
