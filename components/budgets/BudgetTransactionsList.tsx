"use client";

import { useState } from "react";
import { DollarSign, Info, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useDeleteTransaction,
  useCreateTransaction,
} from "@/lib/data-hooks/transactions/useTransactions";
import BudgetTransactionInlineEdit from "@/components/budgets/BudgetTransactionInlineEdit";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

interface Transaction {
  id: string;
  name: string | null;
  description?: string | null;
  amount: number;
  createdAt: Date;
  categoryName: string;
  categoryGroup: string;
  budgetId: string;
  categoryId: string;
  cardId?: string | null;
  occurredAt?: Date | null;
}

interface BudgetTransactionsListProps {
  transactions: Transaction[];
  getGroupColor: (group: string) => string;
}

export default function BudgetTransactionsList({
  transactions,
  getGroupColor,
}: BudgetTransactionsListProps) {
  const deleteTransactionMutation = useDeleteTransaction();
  const createTransactionMutation = useCreateTransaction();
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleCopyTransaction = async (transaction: Transaction) => {
    try {
      const copyData = {
        name: transaction.name ? `${transaction.name} Copy` : undefined,
        description: transaction.description ?? undefined,
        amount: transaction.amount,
        budgetId: transaction.budgetId,
        categoryId: transaction.categoryId,
        cardId: transaction.cardId ?? undefined,
        occurredAt: transaction.occurredAt ?? undefined,
      };

      await createTransactionMutation.mutateAsync(copyData);
      toast.success("Transaction copied successfully!");
    } catch (err) {
      console.error("Failed to copy transaction:", err);
      toast.error("Failed to copy transaction. Please try again.");
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      await deleteTransactionMutation.mutateAsync(transactionToDelete.id);
      setTransactionToDelete(null);
      toast.success("Transaction deleted successfully!");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      toast.error("Failed to delete transaction. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setTransactionToDelete(null);
  };

  const handleInlineEditCancel = () => {
    setEditingTransactionId(null);
  };

  const handleInlineEditSuccess = () => {
    setEditingTransactionId(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          All Transactions
        </h3>
        <div className="py-8 text-center text-gray-500">
          <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No transactions yet</p>
          <p className="text-sm">Start adding transactions to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-6">
      <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
        All Transactions ({transactions.length})
      </h3>
      <div className="h-[400px] overflow-y-auto sm:h-[500px] md:h-[600px]">
        <div className="space-y-3 pr-2 sm:space-y-4">
          {transactions.map((transaction) => {
            // Check if this transaction is being edited
            const isEditing = editingTransactionId === transaction.id;

            if (isEditing) {
              return (
                <BudgetTransactionInlineEdit
                  key={transaction.id}
                  transaction={transaction}
                  onCancel={handleInlineEditCancel}
                  onSuccess={handleInlineEditSuccess}
                  getGroupColor={getGroupColor}
                  formatCurrency={formatCurrency}
                />
              );
            }

            return (
              <div
                key={transaction.id}
                className="group flex items-center justify-between rounded-lg bg-gray-50 p-3 sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div
                      className={`h-3 w-3 rounded-full ${getGroupColor(
                        transaction.categoryGroup.toLowerCase(),
                      )}`}
                    ></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="truncate font-medium text-gray-900">
                          {transaction.name ?? "Unnamed transaction"}
                        </p>
                        {transaction.description && (
                          <div className="group relative flex-shrink-0">
                            <Info className="h-4 w-4 cursor-help text-gray-400" />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              {transaction.description}
                              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="truncate text-sm text-gray-500">
                        {transaction.categoryName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-2 flex items-center space-x-2 sm:space-x-4">
                  {/* Action Icons - Always visible on mobile, hover on desktop */}
                  <div className="flex items-center space-x-1 opacity-100 transition-opacity sm:space-x-2 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => handleCopyTransaction(transaction)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Copy transaction"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditTransaction(transaction)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Edit transaction"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(transaction)}
                      className="rounded p-1 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                      title="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <p
                      className={`font-medium ${transaction.amount < 0 ? "text-green-600" : "text-gray-900"}`}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete the transaction '{itemName}'? This action cannot be undone."
        itemName={transactionToDelete?.name ?? "Unnamed transaction"}
        isLoading={deleteTransactionMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete Transaction"
        cancelText="Cancel"
      />
    </div>
  );
}
