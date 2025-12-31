"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  Target,
} from "lucide-react";
import { CardType } from "@prisma/client";
import { toast } from "react-hot-toast";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { formatCurrency } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { useBudgetHeader } from "../../../../../components/budgets/BudgetHeaderContext";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";

interface IncomeTransaction {
  id: string;
  name: string | null;
  description: string | null;
  amount: number;
  createdAt: Date | string;
  occurredAt: Date | string | null;
  cardId: string | null;
  card?: {
    id: string;
    name: string;
    cardType: string;
  } | null;
}

export default function IncomePage() {
  const params = useParams();
  const budgetId = params.id as string;
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<IncomeTransaction | null>(null);

  const { data: budget, isLoading, refetch } = useBudget(budgetId);
  const { setActions } = useBudgetHeader();

  // Register header actions
  useEffect(() => {
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add Income",
        onClick: () => setIsAddModalOpen(true),
        variant: "primary" as const,
      },
    ]);
  }, [setActions]);

  // Get income transactions from budget transactions
  const incomeTransactions = useMemo(() => {
    if (!budget) return [];

    // Get all debit cards for this budget
    const debitCards = (budget.cards ?? []).filter(
      (card: { cardType: string }) =>
        card.cardType === CardType.DEBIT ||
        card.cardType === CardType.BUSINESS_DEBIT,
    );

    const debitCardIds = debitCards.map((card: { id: string }) => card.id);

    // Filter transactions that are INCOME type on debit cards
    // Note: TransactionType.INCOME will be available after migration
    return (budget.transactions ?? []).filter(
      (transaction: { transactionType: string; cardId: string | null }) =>
        transaction.transactionType === "INCOME" &&
        transaction.cardId &&
        debitCardIds.includes(transaction.cardId),
    ) as IncomeTransaction[];
  }, [budget]);

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return incomeTransactions;

    const query = searchQuery.toLowerCase();
    return incomeTransactions.filter(
      (transaction) =>
        (transaction.name?.toLowerCase().includes(query) ?? false) ||
        (transaction.description?.toLowerCase().includes(query) ?? false) ||
        transaction.amount.toString().includes(query),
    );
  }, [incomeTransactions, searchQuery]);

  // Calculate total income (sum of all income transactions)
  const totalIncome = useMemo(() => {
    return incomeTransactions.reduce((sum, transaction) => {
      return sum + transaction.amount;
    }, 0);
  }, [incomeTransactions]);

  const handleDeleteIncome = async (transaction: IncomeTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteIncome = async () => {
    if (!transactionToDelete) return;

    try {
      const response = await fetch(
        `/api/transactions/${transactionToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete income transaction");
      }

      toast.success("Income deleted successfully!");
      void refetch();
    } catch {
      toast.error("Failed to delete income transaction");
    } finally {
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading income data..." />;
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <Target className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Budget not found</div>
        </div>
      </div>
    );
  }

  // Get main debit card for adding income
  const mainDebitCard =
    (budget.cards ?? []).find(
      (card: { cardType: string; name: string }) =>
        (card.cardType === CardType.DEBIT ||
          card.cardType === CardType.BUSINESS_DEBIT) &&
        card.name === "Main",
    ) ??
    (budget.cards ?? []).find(
      (card: { cardType: string }) =>
        card.cardType === CardType.DEBIT ||
        card.cardType === CardType.BUSINESS_DEBIT,
    );

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search income transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-10 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Total Income Summary */}
            <div className="rounded-xl border-0 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 p-6 shadow-lg sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm sm:p-4">
                  <DollarSign className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white/90 sm:text-xl">
                    Total Income
                  </h3>
                  <p className="text-2xl font-bold text-white sm:text-4xl">
                    {formatCurrency(totalIncome)}
                  </p>
                  <p className="text-sm text-white/80 sm:text-base">
                    From {incomeTransactions.length} income transaction
                    {incomeTransactions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="hidden rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm sm:block">
                  <span className="text-sm font-medium text-white">
                    {budget.period.charAt(0).toUpperCase() +
                      budget.period.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Income List */}
          <div className="mt-4 rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                Income Transactions ({filteredTransactions.length})
              </h3>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No income transactions
                </h3>
                <p className="mt-2 text-gray-500">
                  {searchQuery
                    ? "No income transactions match your search."
                    : "Get started by adding your first income transaction."}
                </p>
                {!searchQuery && mainDebitCard && (
                  <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Income
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-gray-900 sm:text-lg">
                              {transaction.name ?? "Unnamed Income"}
                            </h4>
                          </div>

                          {/* Action Icons */}
                          <div className="flex items-center space-x-2 opacity-100 transition-opacity sm:hidden">
                            <button
                              onClick={() => handleDeleteIncome(transaction)}
                              className="rounded-lg p-2 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                              title="Delete income transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {transaction.description && (
                          <p className="mb-3 text-sm text-gray-600 sm:text-base">
                            {transaction.description}
                          </p>
                        )}

                        <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-6">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium text-gray-900">
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>

                          {transaction.occurredAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {new Date(
                                  transaction.occurredAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {transaction.card && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{transaction.card.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Icons - Desktop */}
                      <div className="hidden items-center justify-end space-x-2 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                        <button
                          onClick={() => handleDeleteIncome(transaction)}
                          className="rounded p-1 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                          title="Delete income transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Income Modal - Use AddTransactionModal with INCOME type */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        budgetId={budgetId}
        cardId={mainDebitCard?.id}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          void refetch();
          setIsAddModalOpen(false);
        }}
        isIncome={true}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Income Transaction"
        message={`Are you sure you want to delete "${transactionToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDeleteIncome}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        itemName={transactionToDelete?.name ?? "this income transaction"}
      />
    </>
  );
}
