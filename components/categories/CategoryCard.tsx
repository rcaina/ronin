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
        className={`group relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md ${
          editingCategoryId === category.id
            ? "border-blue-200 bg-blue-50"
            : "bg-white"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          {editingCategoryId === category.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-lg font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Category name"
            />
          ) : (
            <div className="flex items-center space-x-3">
              <div
                className={`h-3 w-3 rounded-full ${getGroupColor(category.group)}`}
              />
              <h3 className="text-lg font-semibold text-gray-900">
                {category.name}
              </h3>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {/* Action Icons - Only visible on hover when not editing */}
            {editingCategoryId !== category.id ? (
              <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={handleStartEditCategory}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Edit category"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleSaveCategory}
                  disabled={updateCategoryMutation.isPending}
                  className="rounded p-1 text-green-600 transition-colors hover:bg-green-100 disabled:opacity-50"
                  title="Save changes"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancelEditCategory}
                  disabled={updateCategoryMutation.isPending}
                  className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
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
