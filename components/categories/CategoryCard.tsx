"use client";

import { Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useUpdateCategory,
  useDeleteCategory,
} from "@/lib/data-hooks/categories/useCategories";
import { useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import type { GroupColorFunction } from "@/lib/types/budget";
import type { CategoryType } from "@prisma/client";

interface Category {
  id: string;
  name: string;
  group: CategoryType;
  createdAt: string;
  updatedAt: string;
}

interface CategoryCardProps {
  category: Category;
  getGroupColor: GroupColorFunction;
}

export default function CategoryCard({
  category,
  getGroupColor,
}: CategoryCardProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState<string>("");
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const handleStartEditCategory = () => {
    setEditingCategoryId(category.id);
    setEditingName(category.name);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingName("");
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId) return;

    try {
      await updateCategoryMutation.mutateAsync({
        id: editingCategoryId,
        data: {
          name: editingName,
          group: category.group,
        },
      });

      setEditingCategoryId(null);
      setEditingName("");
      toast.success("Category updated successfully!");
    } catch (error) {
      console.error("Failed to update category:", error);
      toast.error("Failed to update category. Please try again.");
    }
  };

  const handleDeleteCategory = () => {
    setCategoryToDelete({
      id: category.id,
      name: category.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
      toast.success("Category deleted successfully!");
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setCategoryToDelete(null);
  };

  return (
    <>
      <div
        className={`card-surface group relative overflow-hidden p-5 transition-all duration-200 ease-out sm:p-6 ${
          editingCategoryId === category.id
            ? "border-secondary-200 bg-secondary-50"
            : "hover:shadow-lifted"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          {editingCategoryId === category.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-lg font-semibold text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              placeholder="Category name"
            />
          ) : (
            <div className="flex items-center space-x-3">
              <div
                className={`h-3 w-3 rounded-full ${getGroupColor(category.group)}`}
              />
              <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                {category.name}
              </h3>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {/* Action Icons - Only visible on hover when not editing */}
            {editingCategoryId !== category.id ? (
              <div className="flex items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                <button
                  onClick={handleStartEditCategory}
                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700"
                  title="Edit category"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleSaveCategory}
                  disabled={updateCategoryMutation.isPending}
                  className="rounded-lg p-2 text-green-600 transition-colors duration-200 hover:bg-green-50 disabled:opacity-50"
                  title="Save changes"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancelEditCategory}
                  disabled={updateCategoryMutation.isPending}
                  className="rounded-lg p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50"
                  title="Cancel editing"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Template category - Available in all budgets
          </p>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name ?? ""}"? This action cannot be undone, but existing budget categories using this template will not be affected.`}
        itemName={categoryToDelete?.name ?? ""}
        isLoading={deleteCategoryMutation.isPending}
        confirmText="Delete Category"
      />
    </>
  );
}
