"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { Search, Plus, Trash2, DollarSign, Info, Target } from "lucide-react";
import { toast } from "react-hot-toast";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { formatCurrency } from "@/lib/utils";
import { isDebitCard, oldestDebitCard } from "@/lib/utils/cards";
import { usePageLoading } from "@/components/ConditionalLayout";
import Button from "@/components/Button";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import SwipeableRow from "@/components/SwipeableRow";
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
    const debitCards = (budget.cards ?? []).filter(isDebitCard);

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

  usePageLoading(isLoading, "Loading income data...");
  if (isLoading) {
    return (
      <div className="bg-surface lg:h-full lg:overflow-y-auto">
        <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
          {/* Total income hero skeleton */}
          <div className="h-24 animate-pulse rounded-4xl bg-surface-muted sm:h-28" />

          {/* Search skeleton */}
          <div className="mt-4 h-10 animate-pulse rounded-xl bg-surface-muted" />

          {/* Income list skeleton */}
          <div className="card-surface mt-4 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 sm:p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-surface-muted" />
                    <div className="h-3 w-20 animate-pulse rounded-full bg-surface-muted" />
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded-full bg-surface-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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

  // Get the oldest-created debit card for adding income (used as the
  // default payment method in the add-income modal).
  const defaultDebitCard = oldestDebitCard(budget.cards ?? []);

  return (
    <>
      <div className="bg-surface lg:h-full lg:overflow-y-auto">
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
              className="w-full rounded-xl border border-gray-300 bg-surface-card py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          {/* Income List */}
          <div className="card-surface mt-4 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => {
                  const dateLabel = [
                    transaction.occurredAt
                      ? new Date(transaction.occurredAt).toLocaleDateString()
                      : new Date(transaction.createdAt).toLocaleDateString(),
                    transaction.card?.name,
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <SwipeableRow
                      key={transaction.id}
                      actions={[
                        {
                          icon: <Trash2 className="h-4 w-4" />,
                          label: "Delete",
                          onClick: () => void handleDeleteIncome(transaction),
                          tone: "danger",
                        },
                      ]}
                    >
                      <div className="group flex items-center justify-between p-3 transition-colors duration-200 hover:bg-surface sm:p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {transaction.name ?? "Unnamed income"}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-accent px-2 py-1 text-xs font-medium text-primary">
                              Income
                            </span>
                            {transaction.description && (
                              <div className="group relative flex-shrink-0">
                                <Info className="h-4 w-4 cursor-help text-gray-400" />
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-xl bg-primary-950/90 px-3 py-2 text-sm text-white opacity-0 shadow-lifted transition-opacity duration-200 group-hover:opacity-100">
                                  {transaction.description}
                                  <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-950/90"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {dateLabel}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <div className="flex items-center opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                            <button
                              onClick={() => handleDeleteIncome(transaction)}
                              className="hidden rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 lg:block"
                              title="Delete income transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums text-green-600">
                              +{formatCurrency(transaction.amount)}
                            </div>
                            <div className="text-xs capitalize text-gray-500">
                              income
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwipeableRow>
                  );
                })
              ) : (
                <div className="flex flex-col items-center px-3 py-12 text-center sm:px-6">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                    <DollarSign className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    No income transactions
                  </h3>
                  <p className="text-sm text-gray-500">
                    {searchQuery
                      ? "No income transactions match your search."
                      : "Get started by adding your first income transaction."}
                  </p>
                  {!searchQuery && defaultDebitCard && (
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add income
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Income Modal - Use AddTransactionModal with INCOME type */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        budgetId={budgetId}
        cardId={defaultDebitCard?.id}
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
