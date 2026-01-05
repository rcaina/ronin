"use client";

import { Edit, Trash2, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  type BudgetCategoryWithCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import type { GroupColorFunction } from "@/lib/types/budget";
import { TransactionType } from "@prisma/client";
import { roundToCents } from "@/lib/utils";
import Button from "@/components/Button";

interface BudgetCategoryCardProps {
  budgetCategory: BudgetCategoryWithCategory;
  budgetId: string;
  getGroupColor: GroupColorFunction;
}

export default function BudgetCategoryCard({
  budgetCategory,
  budgetId,
}: BudgetCategoryCardProps) {
  const router = useRouter();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingAmount, setEditingAmount] = useState<string | number>(0);
  const [editingName, setEditingName] = useState<string>("");
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const updateBudgetCategoryMutation = useUpdateBudgetCategory();
  const deleteBudgetCategoryMutation = useDeleteBudgetCategory();

  const categorySpent = roundToCents(
    (budgetCategory.transactions ?? []).reduce((acc, transaction) => {
      if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce spending (positive amount = refund received)
        return acc - transaction.amount;
      } else {
        // Regular transactions: positive = purchases (increase spending)
        return acc + transaction.amount;
      }
    }, 0),
  );
  const categoryRemaining = roundToCents(
    (budgetCategory.allocatedAmount ?? 0) - categorySpent,
  );
  const categoryPercentage =
    budgetCategory.allocatedAmount && budgetCategory.allocatedAmount > 0
      ? roundToCents((categorySpent / budgetCategory.allocatedAmount) * 100)
      : 0;

  const handleStartEditCategory = () => {
    setEditingCategoryId(budgetCategory.id);
    setEditingAmount(budgetCategory.allocatedAmount ?? 0);
    setEditingName(budgetCategory.name);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingAmount(0);
    setEditingName("");
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId) return;

    // Parse the amount to a valid number
    const amount =
      typeof editingAmount === "string"
        ? parseFloat(editingAmount) || 0
        : editingAmount;

    try {
      await updateBudgetCategoryMutation.mutateAsync({
        budgetId: budgetId,
        categoryId: editingCategoryId,
        data: {
          allocatedAmount: amount,
          name: editingName,
        },
      });

      setEditingCategoryId(null);
      setEditingAmount(0);
      setEditingName("");
      toast.success("Budget category updated successfully!");
    } catch (error) {
      console.error("Failed to update budget category:", error);
      toast.error("Failed to update budget category. Please try again.");
    }
  };

  const handleDeleteCategory = () => {
    setCategoryToDelete({
      id: budgetCategory.id,
      name: budgetCategory.name,
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

  const handleViewAllTransactions = () => {
    router.push(
      `/budgets/${budgetId}/transactions?category=${budgetCategory.id}`,
    );
  };

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", budgetCategory.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`group relative cursor-grab overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:cursor-grabbing ${
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

        <div className="mb-3 flex items-center justify-between">
          {editingCategoryId === budgetCategory.id ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-base font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Category name"
              />
            </div>
          ) : (
            <h3 className="text-base font-semibold text-gray-900">
              {budgetCategory.name}
            </h3>
          )}
          <div className="flex items-center space-x-2">
            {/* Action Icons - Only visible on hover when not editing */}
            {editingCategoryId !== budgetCategory.id && (
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
            )}
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                categoryPercentage === 100
                  ? "bg-green-100 text-green-800"
                  : categoryPercentage > 100
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {categoryPercentage.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-gray-500">Allocated</span>
              {editingCategoryId === budgetCategory.id ? (
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-500">$</span>
                  <input
                    type="text"
                    value={
                      typeof editingAmount === "number"
                        ? editingAmount === 0
                          ? ""
                          : String(editingAmount)
                        : editingAmount
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow digits and one period for decimals
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setEditingAmount(value);
                      }
                    }}
                    className="w-20 rounded-md border border-gray-300 px-1 py-0.5 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <span className="font-medium">
                  $
                  {(budgetCategory.allocatedAmount ?? 0)
                    .toFixed(2)
                    .toLocaleString()}
                </span>
              )}
            </div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-gray-500">Spent</span>
              <span className="font-medium">
                ${categorySpent.toFixed(2).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
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
                categoryPercentage === 100
                  ? "bg-green-500"
                  : categoryPercentage > 100
                    ? "bg-red-500"
                    : "bg-secondary"
              }`}
              style={{
                width: `${categoryPercentage > 100 ? 100 : categoryPercentage}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Edit Mode Action Buttons */}
        {editingCategoryId === budgetCategory.id && (
          <div className="mt-3 flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEditCategory}
              disabled={updateBudgetCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveCategory}
              isLoading={updateBudgetCategoryMutation.isPending}
            >
              Save
            </Button>
          </div>
        )}

        {/* Recent Transactions */}
        {budgetCategory.transactions &&
          budgetCategory.transactions.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <h4 className="mb-2 text-xs font-medium text-gray-700">
                Recent Transactions
              </h4>
              <div className="space-y-1.5">
                {budgetCategory.transactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-gray-900">
                        {transaction.name ?? "Unnamed transaction"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`font-medium ${transaction.transactionType === TransactionType.RETURN ? "text-green-600" : "text-gray-900"}`}
                    >
                      {transaction.amount < 0 ? "-" : ""}$
                      {Math.abs(transaction.amount).toFixed(2).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="text-center">
                  <button
                    onClick={handleViewAllTransactions}
                    className="cursor-pointer text-center text-xs text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                    title={`View all ${budgetCategory.transactions.length} transactions for ${budgetCategory.name}`}
                  >
                    View all transactions
                  </button>
                </div>
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
