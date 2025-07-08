"use client";

import { useState } from "react";
import {
  useCategories,
  useDeleteCategory,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/data-hooks/categories/useCategories";
import PageHeader from "@/components/PageHeader";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import CategoryColumn from "@/components/categories/CategoryColumn";
import { DollarSign, ShoppingBag, TrendingUp, Info } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CategoryType } from "@prisma/client";

const CategoryTypeColors = {
  [CategoryType.WANTS]: "bg-purple-100 text-purple-800 border-purple-200",
  [CategoryType.NEEDS]: "bg-blue-100 text-blue-800 border-blue-200",
  [CategoryType.INVESTMENT]: "bg-green-100 text-green-800 border-green-200",
};

const CategoryTypeLabels = {
  [CategoryType.WANTS]: "Wants",
  [CategoryType.NEEDS]: "Needs",
  [CategoryType.INVESTMENT]: "Investment",
};

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories();
  const deleteCategoryMutation = useDeleteCategory();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeColumn, setActiveColumn] = useState<
    "wants" | "needs" | "investment" | null
  >(null);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    group: CategoryType;
  } | null>(null);

  const handleAddCategory = (column: "wants" | "needs" | "investment") => {
    setIsAddingCategory(true);
    setActiveColumn(column);
  };

  const handleCancelAdd = () => {
    setIsAddingCategory(false);
    setActiveColumn(null);
  };

  const handleSubmitCategory = async (data: {
    name: string;
    group: CategoryType;
  }) => {
    try {
      await createCategoryMutation.mutateAsync({
        name: data.name.trim(),
        group: data.group,
      });

      handleCancelAdd();
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to create category:", err);
    }
  };

  const handleEditCategory = (category: {
    id: string;
    name: string;
    group: CategoryType;
  }) => {
    setEditingCategory(category);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleSubmitEdit = async (data: {
    name: string;
    group: CategoryType;
  }) => {
    if (!editingCategory) return;

    try {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        data: {
          name: data.name.trim(),
          group: data.group,
        },
      });

      handleCancelEdit();
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to update category:", err);
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    setCategoryToDelete({ id: categoryId, name: categoryName });
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to delete category:", err);
    }
  };

  const handleCancelDelete = () => {
    setCategoryToDelete(null);
  };

  const handleDuplicateCategory = async (categoryId: string) => {
    try {
      // Find the category to duplicate
      const categoryToDuplicate = [
        ...(categories?.wants ?? []),
        ...(categories?.needs ?? []),
        ...(categories?.investment ?? []),
      ].find((cat) => cat.id === categoryId);

      if (!categoryToDuplicate) {
        console.error("Failed to find category to duplicate");
        return;
      }

      // Create a copy with "Copy" appended to the name
      const copyData = {
        name: `${categoryToDuplicate.name} Copy`,
        group: categoryToDuplicate.group,
      };

      await createCategoryMutation.mutateAsync(copyData);
    } catch (err) {
      console.error("Failed to duplicate category:", err);
    }
  };

  const handleMoveCategory = async (
    categoryId: string,
    newGroup: CategoryType,
  ) => {
    try {
      // Find the category to move
      const categoryToMove = [
        ...(categories?.wants ?? []),
        ...(categories?.needs ?? []),
        ...(categories?.investment ?? []),
      ].find((cat) => cat.id === categoryId);

      if (!categoryToMove) {
        console.error("Failed to find category to move");
        return;
      }

      // Don't update if it's already in the same group
      if (categoryToMove.group === newGroup) {
        return;
      }

      // Update the category with the new group
      await updateCategoryMutation.mutateAsync({
        id: categoryId,
        data: {
          name: categoryToMove.name,
          group: newGroup,
        },
      });
    } catch (err) {
      console.error("Failed to move category:", err);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading categories..." />;
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <PageHeader
          title="Category Templates"
          description="Manage your reusable category templates"
        />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-800">
                Failed to load category templates. Please try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Category Templates"
        description="Create and manage reusable category templates for your budgets"
      />

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-8 lg:px-8">
          {/* Info Banner */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:mb-8 sm:p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Info className="h-4 w-4 text-blue-400 sm:h-5 sm:w-5" />
              </div>
              <div className="ml-2 sm:ml-3">
                <h3 className="text-xs font-medium text-blue-800 sm:text-sm">
                  Category Templates
                </h3>
                <p className="mt-1 text-xs text-blue-700 sm:text-sm">
                  These are reusable category templates. When you create a
                  budget, you can select from these templates and set specific
                  spending limits for that budget period.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Wants Column */}
            <CategoryColumn
              type={CategoryType.WANTS}
              categories={categories?.wants ?? []}
              icon={ShoppingBag}
              colorClass={CategoryTypeColors[CategoryType.WANTS]}
              label={CategoryTypeLabels[CategoryType.WANTS]}
              onAddCategory={handleSubmitCategory}
              onEditCategory={handleSubmitEdit}
              onDeleteCategory={handleDeleteCategory}
              onDuplicateCategory={handleDuplicateCategory}
              onMoveCategory={handleMoveCategory}
              isAddingCategory={isAddingCategory}
              activeColumn={activeColumn}
              onStartAdd={handleAddCategory}
              onCancelAdd={handleCancelAdd}
              editingCategory={editingCategory}
              onStartEdit={handleEditCategory}
              onCancelEdit={handleCancelEdit}
              isCreateLoading={createCategoryMutation.isPending}
              isUpdateLoading={updateCategoryMutation.isPending}
            />

            {/* Needs Column */}
            <CategoryColumn
              type={CategoryType.NEEDS}
              categories={categories?.needs ?? []}
              icon={DollarSign}
              colorClass={CategoryTypeColors[CategoryType.NEEDS]}
              label={CategoryTypeLabels[CategoryType.NEEDS]}
              onAddCategory={handleSubmitCategory}
              onEditCategory={handleSubmitEdit}
              onDeleteCategory={handleDeleteCategory}
              onDuplicateCategory={handleDuplicateCategory}
              onMoveCategory={handleMoveCategory}
              isAddingCategory={isAddingCategory}
              activeColumn={activeColumn}
              onStartAdd={handleAddCategory}
              onCancelAdd={handleCancelAdd}
              editingCategory={editingCategory}
              onStartEdit={handleEditCategory}
              onCancelEdit={handleCancelEdit}
              isCreateLoading={createCategoryMutation.isPending}
              isUpdateLoading={updateCategoryMutation.isPending}
            />

            {/* Investment Column */}
            <CategoryColumn
              type={CategoryType.INVESTMENT}
              categories={categories?.investment ?? []}
              icon={TrendingUp}
              colorClass={CategoryTypeColors[CategoryType.INVESTMENT]}
              label={CategoryTypeLabels[CategoryType.INVESTMENT]}
              onAddCategory={handleSubmitCategory}
              onEditCategory={handleSubmitEdit}
              onDeleteCategory={handleDeleteCategory}
              onDuplicateCategory={handleDuplicateCategory}
              onMoveCategory={handleMoveCategory}
              isAddingCategory={isAddingCategory}
              activeColumn={activeColumn}
              onStartAdd={handleAddCategory}
              onCancelAdd={handleCancelAdd}
              editingCategory={editingCategory}
              onStartEdit={handleEditCategory}
              onCancelEdit={handleCancelEdit}
              isCreateLoading={createCategoryMutation.isPending}
              isUpdateLoading={updateCategoryMutation.isPending}
            />
          </div>

          {/* Empty State - only show if no categories and not adding */}
          {(!categories ||
            (categories.wants.length === 0 &&
              categories.needs.length === 0 &&
              categories.investment.length === 0)) &&
            !isAddingCategory && (
              <div className="col-span-full mt-8 text-center sm:mt-10">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 sm:mb-4 sm:h-12 sm:w-12">
                    <ShoppingBag className="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="mb-2 text-base font-medium text-gray-900 sm:text-lg">
                    No category templates yet
                  </h3>
                  <p className="mb-4 text-sm text-gray-500 sm:mb-6 sm:text-base">
                    Create reusable category templates that you can use across
                    multiple budgets. Templates help you maintain consistency in
                    your financial planning.
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Category Template"
        message={`Are you sure you want to delete "${categoryToDelete?.name ?? ""}"? This action cannot be undone.`}
        itemName={categoryToDelete?.name ?? ""}
        isLoading={deleteCategoryMutation.isPending}
        confirmText="Delete Template"
      />
    </div>
  );
}
