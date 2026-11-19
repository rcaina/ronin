"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import { useActiveBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { findContinuousBudgetId } from "@/lib/utils/budget-month";
import { useCreateCardPayment } from "@/lib/data-hooks/transactions/useTransactions";
import type { TransactionWithRelations } from "@/lib/types/transaction";
import { useLockBodyScroll } from "@/lib/utils/hooks";
import { isDebitCard } from "@/lib/utils/cards";

import Button from "@/components/Button";
import { CardType } from "@prisma/client";

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: TransactionWithRelations | null;
  onSuccess?: () => void;
  currentCardId?: string; // Optional current card ID to pre-select
  budgetId?: string;
}

export function CardPaymentModal({
  isOpen,
  onClose,
  editingTransaction,
  onSuccess,
  currentCardId,
  budgetId,
}: CardPaymentModalProps) {
  const { data: allCards = [] } = useCards();
  const { data: budgets = [] } = useActiveBudgets();
  const createCardPaymentMutation = useCreateCardPayment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    budgetId: "",
    fromCardId: "",
    toCardId: "",
  });

  // Both cards must be on the payment's budget, or the API refuses them.
  const cards = useMemo(
    () => allCards.filter((card) => card.budgetId === formData.budgetId),
    [allCards, formData.budgetId],
  );

  // Memoize the current card lookup to avoid dependency array issues
  const currentCard = useMemo(() => {
    return allCards.find((card) => card.id === currentCardId);
  }, [allCards, currentCardId]);

  // Memoize the card type to avoid dependency array issues
  const currentCardType = useMemo(() => {
    return currentCard?.cardType;
  }, [currentCard?.cardType]);

  const currentCardBudgetId = currentCard?.budgetId ?? undefined;

  // Initialize form data when editing
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        name: editingTransaction.name ?? "",
        description: editingTransaction.description ?? "",
        amount: Math.abs(editingTransaction.amount).toString(),
        budgetId: editingTransaction.budgetId,
        fromCardId: editingTransaction.cardId ?? "",
        toCardId: "", // We'll need to find the linked transaction to get this
      });
    } else {
      const isCredit =
        currentCardType === CardType.CREDIT ||
        currentCardType === CardType.BUSINESS_CREDIT;

      setFormData({
        name: "",
        description: "",
        amount: "",
        budgetId: budgetId ?? currentCardBudgetId ?? "",
        fromCardId: isCredit ? "" : (currentCardId ?? ""),
        toCardId: isCredit ? (currentCardId ?? "") : "",
      });
    }
  }, [
    editingTransaction,
    currentCardId,
    currentCardType,
    currentCardBudgetId,
    budgetId,
  ]);

  // Set default budget when budgets are loaded and no budgetId is provided
  useEffect(() => {
    if (
      !editingTransaction &&
      !budgetId &&
      budgets.length > 0 &&
      !formData.budgetId
    ) {
      setFormData((prev) => ({
        ...prev,
        budgetId: findContinuousBudgetId(budgets) ?? budgets[0]?.id ?? "",
      }));
    }
  }, [budgets, editingTransaction, budgetId, formData.budgetId]);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createCardPaymentMutation.mutateAsync({
        ...formData,
        amount: Math.abs(parseFloat(formData.amount)),
      });

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        amount: "",
        budgetId: "",
        fromCardId: "",
        toCardId: "",
      });
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating card payment:", error);
      alert("Failed to create card payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter cards by type for better UX. Note: "debit" here intentionally
  // includes CASH as a payment source, in addition to DEBIT/BUSINESS_DEBIT.
  const debitCards = cards.filter(
    (card) => isDebitCard(card) || card.cardType === CardType.CASH,
  );
  const creditCards = cards.filter(
    (card) =>
      card.cardType === CardType.CREDIT ||
      card.cardType === CardType.BUSINESS_CREDIT,
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border bg-surface-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingTransaction ? "Edit card payment" : "Pay credit card"}
          </h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="tap-target rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Payment Name (Optional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Credit Card Payment"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="e.g., Monthly payment for Chase card"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Payment Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          {!budgetId && !editingTransaction?.budgetId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Budget *
              </label>

              <select
                value={formData.budgetId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budgetId: e.target.value,
                    fromCardId: "",
                    toCardId: "",
                  }))
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">Select a budget</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              From (Debit/Cash Card) *
            </label>
            <select
              value={formData.fromCardId}
              onChange={(e) => handleInputChange("fromCardId", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="">Select source card</option>
              {debitCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.cardType}) - {card.user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              To (Credit Card) *
            </label>
            <select
              value={formData.toCardId}
              onChange={(e) => handleInputChange("toCardId", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="">Select destination card</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.cardType}) - {card.user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting || createCardPaymentMutation.isPending}
              disabled={
                isSubmitting ||
                createCardPaymentMutation.isPending ||
                !formData.amount ||
                !formData.budgetId ||
                !formData.fromCardId ||
                !formData.toCardId
              }
              className="flex-1"
            >
              {editingTransaction ? "Update payment" : "Create payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
