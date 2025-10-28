"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import CategoryCard from "./CategoryCard";
import AddCategoryForm from "./AddCategoryForm";
import {
  useCategories,
  useCreateCategory,
} from "@/lib/data-hooks/categories/useCategories";
import type {
  GroupColorFunction,
  GroupLabelFunction,
} from "@/lib/types/budget";
import { CategoryType } from "@prisma/client";
import type { GroupedCategories } from "@/lib/data-hooks/services/categories";

interface CategoryListViewProps {
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
  categories?: GroupedCategories;
}

export default function CategoryListView({
  getGroupColor,
  getGroupLabel,
  categories: propCategories,
}: CategoryListViewProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeGroup, setActiveGroup] = useState<CategoryType | null>(null);
  const { data: hookCategories } = useCategories();
  const categories = propCategories ?? hookCategories;
  const createCategoryMutation = useCreateCategory();

  const handleStartAddCategory = (group: CategoryType) => {
    setIsAddingCategory(true);
    setActiveGroup(group);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setActiveGroup(null);
  };

  const handleSubmitAddCategory = async (data: {
    name: string;
    group: CategoryType;
  }) => {
    try {
      await createCategoryMutation.mutateAsync({
        name: data.name,
        group: data.group,
      });

      handleCancelAddCategory();
      toast.success("Category added successfully!");
    } catch (error) {
      console.error("Failed to add category:", error);
      toast.error("Failed to add category. Please try again.");
    }
  };

  if (!categories) {
    return <div>Loading...</div>;
  }

  // Define the three main category groups
  const categoryGroups = [
    { type: CategoryType.NEEDS, data: categories.needs },
    { type: CategoryType.WANTS, data: categories.wants },
    { type: CategoryType.INVESTMENT, data: categories.investment },
  ];

  return (
    <div className="space-y-6">
      {categoryGroups.map((group) => (
        <div key={group.type} className="space-y-3">
          {/* Group Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center space-x-3">
              <div
                className={`h-4 w-4 rounded-full ${getGroupColor(group.type)}`}
              />
              <h2 className="text-lg font-semibold text-gray-900">
                {getGroupLabel(group.type)}
              </h2>
              <span className="text-sm text-gray-500">
                ({group.data.length})
              </span>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            {group.data.map((category) => (
              <div key={category.id}>
                <CategoryCard
                  category={category}
                  getGroupColor={getGroupColor}
                />
              </div>
            ))}

            {/* Add Category Form */}
            {isAddingCategory && activeGroup === group.type ? (
              <div className="pt-2">
                <AddCategoryForm
                  onSubmit={(data) =>
                    handleSubmitAddCategory({ ...data, group: group.type })
                  }
                  onCancel={handleCancelAddCategory}
                  isLoading={createCategoryMutation.isPending}
                />
              </div>
            ) : (
              !isAddingCategory && (
                <button
                  onClick={() => handleStartAddCategory(group.type)}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                      +
                    </div>
                    <p className="text-sm font-medium">Add Category</p>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
