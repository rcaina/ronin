"use client";

import { CheckCircle2, Circle, Edit, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useUpdateCategory,
  useDeleteCategory,
} from "@/lib/data-hooks/categories/useCategories";
import { useEffect, useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import SwipeableRow from "@/components/SwipeableRow";
import { getSelectableTileProps } from "@/lib/utils/selection";
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
  /**
   * Renders as a swipeable list row (touch-only swipe-left reveal for
   * Edit/Delete) instead of desktop-hover-only icons. Only the list view
   * should opt in — grid tiles must stay exactly as they are since they sit
   * in a multi-column grid where horizontal swipes would misfire.
   */
  swipeable?: boolean;
  /**
   * While true, the card renders as a selectable tile for the "merge
   * categories" flow: edit/delete/swipe actions are suppressed and clicking
   * the card toggles `selected` via `onToggleSelect` instead.
   */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function CategoryCard({
  category,
  getGroupColor,
  swipeable = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
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

  // Entering selection mode hides the inline edit form; drop the in-progress
  // edit too so a stale half-typed name doesn't reappear when selection ends.
  useEffect(() => {
    if (selectionMode) {
      setEditingCategoryId(null);
      setEditingName("");
    }
  }, [selectionMode]);

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

  const isEditing = !selectionMode && editingCategoryId === category.id;

  const selectionProps = getSelectableTileProps({
    selectionMode,
    selected,
    label: `Select ${category.name}`,
    onToggle: () => onToggleSelect?.(category.id),
  });

  const cardContent = (
    <div
      {...selectionProps}
      className={`card-surface group relative overflow-hidden p-5 transition-all duration-200 ease-out sm:p-6 ${
        selectionMode
          ? `cursor-pointer ${
              selected
                ? "border-secondary bg-secondary/5 ring-2 ring-secondary"
                : "hover:border-secondary/40 hover:bg-secondary/5"
            }`
          : isEditing
            ? "border-secondary-200 bg-secondary-50"
            : "hover:shadow-lifted"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-lg font-semibold text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="Category name"
          />
        ) : (
          <div className="flex items-center space-x-3">
            {selectionMode ? (
              selected ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-secondary-700" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" />
              )
            ) : (
              <div
                className={`h-3 w-3 rounded-full ${getGroupColor(category.group)}`}
              />
            )}
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              {category.name}
            </h3>
          </div>
        )}
        {!selectionMode && (
          <div className="flex items-center space-x-2">
            {/* Action Icons - Only visible on hover when not editing.
                When swipeable (list view), these are desktop-hover only since
                mobile exposes Edit/Delete via swipe (SwipeableRow). */}
            {!isEditing ? (
              <div
                className={
                  swipeable
                    ? "hidden items-center gap-0.5 transition-opacity lg:flex lg:opacity-0 lg:group-hover:opacity-100"
                    : "flex items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                }
              >
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
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          Template category - Available in all budgets
        </p>
      </div>
    </div>
  );

  return (
    <>
      {swipeable ? (
        <SwipeableRow
          disabled={isEditing || selectionMode}
          className="rounded-2xl"
          actions={[
            {
              icon: <Pencil className="h-4 w-4" />,
              label: "Edit",
              onClick: handleStartEditCategory,
            },
            {
              icon: <Trash2 className="h-4 w-4" />,
              label: "Delete",
              onClick: handleDeleteCategory,
              tone: "danger",
            },
          ]}
        >
          {cardContent}
        </SwipeableRow>
      ) : (
        cardContent
      )}

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
