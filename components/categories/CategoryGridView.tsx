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
import type { GroupedCategories } from "@/lib/types/category";

interface CategoryGridViewProps {
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
  categories?: GroupedCategories;
}

export default function CategoryGridView({
  getGroupColor,
  getGroupLabel,
  categories: propCategories,
}: CategoryGridViewProps) {
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
        <div key={group.type} className="space-y-4">
          {/* Group Header */}
          <div className="flex items-center justify-between border-b border-gray-200/70 pb-3">
            <div className="flex items-center space-x-3">
              <div
                className={`h-3 w-3 rounded-full ${getGroupColor(group.type)}`}
              />
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                {getGroupLabel(group.type)}
              </h2>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500">
                {group.data.length}
              </span>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.data.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                getGroupColor={getGroupColor}
              />
            ))}

            {/* Add Category Form */}
            {isAddingCategory && activeGroup === group.type ? (
              <AddCategoryForm
                onSubmit={(data) =>
                  handleSubmitAddCategory({ ...data, group: group.type })
                }
                onCancel={handleCancelAddCategory}
                isLoading={createCategoryMutation.isPending}
              />
            ) : (
              !isAddingCategory && (
                <button
                  onClick={() => handleStartAddCategory(group.type)}
                  className="flex min-h-[180px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-surface-card text-gray-500 transition-all duration-200 ease-out hover:border-secondary hover:bg-secondary/5 hover:text-secondary-700 active:scale-[0.98]"
                >
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                      +
                    </div>
                    <p className="text-sm font-medium">Add category</p>
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
