"use client";

import { Edit, Trash2, GripVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import type {
  BudgetCategoryWithRelations,
  GroupColorFunction,
} from "@/lib/types/budget";

interface BudgetCategoryCardProps {
  budgetCategory: BudgetCategoryWithRelations;
  budgetId: string;
  getGroupColor: GroupColorFunction;
}

export default function BudgetCategoryCard({
  budgetCategory,
  budgetId,
}: BudgetCategoryCardProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const updateBudgetCategoryMutation = useUpdateBudgetCategory();
  const deleteBudgetCategoryMutation = useDeleteBudgetCategory();

  const categorySpent = (budgetCategory.transactions ?? []).reduce(
    (acc, transaction) => acc + transaction.amount,
    0,
  );
  const categoryRemaining = budgetCategory.allocatedAmount - categorySpent;
  const categoryPercentage =
    budgetCategory.allocatedAmount > 0
      ? (categorySpent / budgetCategory.allocatedAmount) * 100
      : 0;

  const handleStartEditCategory = () => {
    setEditingCategoryId(budgetCategory.id);
    setEditingAmount(budgetCategory.allocatedAmount);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingAmount(0);
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId) return;

    try {
      await updateBudgetCategoryMutation.mutateAsync({
        budgetId: budgetId,
        categoryId: editingCategoryId,
        data: {
          allocatedAmount: editingAmount,
        },
      });

      setEditingCategoryId(null);
      setEditingAmount(0);
      toast.success("Budget category updated successfully!");
    } catch (error) {
      console.error("Failed to update budget category:", error);
      toast.error("Failed to update budget category. Please try again.");
    }
  };

  const handleDeleteCategory = () => {
    setCategoryToDelete({
      id: budgetCategory.id,
      name: budgetCategory.category.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteBudgetCategoryMutation.mutateAsync({
        budgetId: budgetId,
        categoryId: categoryToDelete.id,
      });
      setCategoryToDelete(null);
      toast.success("Budget category deleted successfully!");
    } catch (error) {
      console.error("Failed to delete budget category:", error);
      toast.error("Failed to delete budget category. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setCategoryToDelete(null);
  };

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", budgetCategory.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`group relative cursor-grab overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:cursor-grabbing ${
          editingCategoryId === budgetCategory.id
            ? "border-blue-200 bg-blue-50"
            : "bg-white"
        }`}
      >
        {/* Drag Handle */}
        <div
          className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {budgetCategory.category.name}
          </h3>
          <div className="flex items-center space-x-2">
            {/* Action Icons - Only visible on hover */}
            <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleStartEditCategory}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Edit allocation"
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
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                categoryPercentage > 90
                  ? "bg-red-100 text-red-800"
                  : categoryPercentage > 75
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {categoryPercentage.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-500">Allocated</span>
              {editingCategoryId === budgetCategory.id ? (
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingAmount}
                    onChange={(e) =>
                      setEditingAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-20 rounded border border-gray-300 px-1 py-0.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSaveCategory}
                    disabled={updateBudgetCategoryMutation.isPending}
                    className="rounded-md p-2 text-green-600 hover:bg-green-200 disabled:opacity-50"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    onClick={handleCancelEditCategory}
                    disabled={updateBudgetCategoryMutation.isPending}
                    className="rounded p-2 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="font-medium">
                  ${budgetCategory.allocatedAmount.toFixed(2).toLocaleString()}
                </span>
              )}
            </div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-500">Spent</span>
              <span className="font-medium">
                ${categorySpent.toFixed(2).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Remaining</span>
              <span
                className={`font-medium ${
                  categoryRemaining >= 0 ? "text-gray-900" : "text-red-600"
                }`}
              >
                ${categoryRemaining.toFixed(2).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                categoryPercentage > 90
                  ? "bg-red-500"
                  : categoryPercentage > 75
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(categoryPercentage, 100)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Recent Transactions */}
        {budgetCategory.transactions &&
          budgetCategory.transactions.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-700">
                Recent Transactions
              </h4>
              <div className="space-y-2">
                {budgetCategory.transactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-gray-900">
                        {transaction.name ?? "Unnamed transaction"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`font-medium ${transaction.amount < 0 ? "text-green-600" : "text-gray-900"}`}
                    >
                      {transaction.amount < 0 ? "-" : ""}$
                      {Math.abs(transaction.amount).toFixed(2).toLocaleString()}
                    </span>
                  </div>
                ))}
                {budgetCategory.transactions.length > 3 && (
                  <p className="text-center text-xs text-gray-500">
                    +{budgetCategory.transactions.length - 3} more transactions
                  </p>
                )}
              </div>
            </div>
          )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Budget Category"
        message={`Are you sure you want to remove "${categoryToDelete?.name ?? ""}" from this budget? This action cannot be undone.`}
        itemName={categoryToDelete?.name ?? ""}
        isLoading={deleteBudgetCategoryMutation.isPending}
        confirmText="Delete Category"
      />
    </>
  );
}
