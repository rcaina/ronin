"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  DollarSign,
  HandCoins,
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
        label: "Add income",
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
            <Target className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Budget not found
          </div>
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
      <div className="h-full overflow-y-auto bg-surface">
        <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
          {/* Total Income Hero */}
          <div className="animate-fade-in-up rounded-4xl bg-primary p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="rounded-full bg-secondary/20 p-3 sm:p-4">
                <DollarSign className="h-6 w-6 text-secondary sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/70 sm:text-sm">
                  Total income
                </p>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
                  {formatCurrency(totalIncome)}
                </p>
                <p className="mt-0.5 text-xs text-white/70 sm:text-sm">
                  From {incomeTransactions.length} income transaction
                  {incomeTransactions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium capitalize text-white sm:px-4 sm:py-2 sm:text-sm">
                {budget.period.replace("_", " ").toLowerCase()}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search income transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-10 py-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          {/* Income List */}
          <div className="card-surface mt-4 p-4 sm:p-5 lg:p-6">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                Income transactions
              </h3>
              <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium tabular-nums text-secondary-700">
                {filteredTransactions.length}
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                  <DollarSign className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No income transactions
                </h3>
                <p className="mt-2 text-sm text-gray-500">
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
                    Add income
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => {
                  const meta = [
                    transaction.occurredAt
                      ? new Date(transaction.occurredAt).toLocaleDateString()
                      : new Date(transaction.createdAt).toLocaleDateString(),
                    transaction.card?.name,
                    transaction.description,
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 bg-white p-3 transition-all duration-200 ease-out hover:shadow-soft sm:p-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <HandCoins className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 sm:text-base">
                            {transaction.name ?? "Unnamed income"}
                          </p>
                          <p className="truncate text-xs text-gray-500 sm:text-sm">
                            {meta}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <span className="text-sm font-semibold tabular-nums text-green-600 sm:text-base">
                          +{formatCurrency(transaction.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteIncome(transaction)}
                          className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                          title="Delete income transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
