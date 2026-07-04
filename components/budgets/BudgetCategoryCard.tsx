"use client";

import { Edit, Trash2, GripVertical, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import type { BudgetCategoryWithCategory } from "@/lib/types/budget";
import { useState } from "react";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import type { GroupColorFunction } from "@/lib/types/budget";
import { TransactionType } from "@prisma/client";
import { formatCurrency, roundToCents } from "@/lib/utils";
import {
  calculateCategorySpent,
  type SpendingCategory,
  type SpendingTransaction,
} from "@/lib/utils/spending";
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
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false);

  const updateBudgetCategoryMutation = useUpdateBudgetCategory();
  const deleteBudgetCategoryMutation = useDeleteBudgetCategory();

  const spendingCategory: SpendingCategory = {
    transactions: (budgetCategory.transactions ?? []).map(
      (transaction): SpendingTransaction => ({
        ...transaction,
        transactionType: transaction.transactionType as TransactionType,
      }),
    ),
  };
  const categorySpent = roundToCents(calculateCategorySpent(spendingCategory));
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
        className={`group relative cursor-grab overflow-hidden rounded-2xl border p-4 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lifted active:cursor-grabbing ${
          editingCategoryId === budgetCategory.id
            ? "border-secondary-300 bg-secondary-50"
            : "border-gray-200/70 bg-surface-card hover:border-gray-300/80"
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
                className="rounded-xl border border-gray-300 px-2 py-1 text-base font-semibold text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
              <div className="flex items-center space-x-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                <button
                  onClick={handleStartEditCategory}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
                  title="Edit category"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                categoryPercentage === 100
                  ? "bg-green-50 text-green-700"
                  : categoryPercentage > 100
                    ? "bg-red-50 text-red-700"
                    : "bg-secondary-100 text-secondary-800"
              }`}
            >
              {categoryPercentage.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {editingCategoryId === budgetCategory.id ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Allocated</span>
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
                  className="w-20 rounded-lg border border-gray-300 px-1 py-0.5 text-right text-sm tabular-nums focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-gray-500">
                <span className="font-medium tabular-nums text-gray-900">
                  {formatCurrency(categorySpent)}
                </span>{" "}
                spent of {formatCurrency(budgetCategory.allocatedAmount ?? 0)}
              </span>
              <span
                className={`flex-shrink-0 font-medium tabular-nums ${
                  categoryRemaining >= 0 ? "text-gray-500" : "text-red-600"
                }`}
              >
                {categoryRemaining >= 0
                  ? `${formatCurrency(categoryRemaining)} left`
                  : `${formatCurrency(Math.abs(categoryRemaining))} over`}
              </span>
            </div>
          )}

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
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

        {/* Transactions — collapsed by default to keep cards uniform */}
        {budgetCategory.transactions &&
          budgetCategory.transactions.length > 0 &&
          editingCategoryId !== budgetCategory.id && (
            <div className="mt-3 border-t border-gray-100 pt-1.5">
              <button
                onClick={() =>
                  setIsTransactionsExpanded(!isTransactionsExpanded)
                }
                className="flex w-full items-center justify-between rounded-lg py-1 text-xs font-medium text-gray-500 transition-colors duration-200 hover:text-gray-700"
                title={
                  isTransactionsExpanded
                    ? "Hide transactions"
                    : "Show recent transactions"
                }
              >
                <span className="tabular-nums">
                  {budgetCategory.transactions.length} transaction
                  {budgetCategory.transactions.length !== 1 ? "s" : ""}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isTransactionsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isTransactionsExpanded && (
                <div className="mt-1.5 space-y-1.5">
                  {budgetCategory.transactions
                    .slice(0, 3)
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-gray-900">
                            {transaction.name ?? "Unnamed transaction"}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {new Date(
                              transaction.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`font-medium tabular-nums ${transaction.transactionType === TransactionType.RETURN ? "text-green-600" : "text-gray-900"}`}
                        >
                          {transaction.amount < 0 ? "-" : ""}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>
                    ))}
                  <div className="text-center">
                    <button
                      onClick={handleViewAllTransactions}
                      className="cursor-pointer text-center text-xs font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800 hover:underline"
                      title={`View all ${budgetCategory.transactions.length} transactions for ${budgetCategory.name}`}
                    >
                      View all transactions
                    </button>
                  </div>
                </div>
              )}
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
