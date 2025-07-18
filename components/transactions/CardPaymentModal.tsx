"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCreateCardPayment } from "@/lib/data-hooks/transactions/useTransactions";
import type { TransactionWithRelations } from "@/lib/types/transaction";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: TransactionWithRelations | null;
  onSuccess?: () => void;
  currentCardId?: string; // Optional current card ID to pre-select
}

export function CardPaymentModal({
  isOpen,
  onClose,
  editingTransaction,
  onSuccess,
  currentCardId,
}: CardPaymentModalProps) {
  const { data: cards = [] } = useCards();
  const { data: budgets = [] } = useBudgets();
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

  // Memoize the current card lookup to avoid dependency array issues
  const currentCard = useMemo(() => {
    return cards.find((card) => card.id === currentCardId);
  }, [cards, currentCardId]);

  // Memoize the card type to avoid dependency array issues
  const currentCardType = useMemo(() => {
    return currentCard?.cardType;
  }, [currentCard?.cardType]);

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
        currentCardType === "CREDIT" || currentCardType === "BUSINESS_CREDIT";
      setFormData({
        name: "",
        description: "",
        amount: "",
        budgetId: budgets[0]?.id ?? "",
        fromCardId: isCredit ? "" : (currentCardId ?? ""),
        toCardId: isCredit ? (currentCardId ?? "") : "",
      });
    }
  }, [editingTransaction, currentCardId, budgets, currentCardType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createCardPaymentMutation.mutateAsync({
        ...formData,
        amount: parseFloat(formData.amount),
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

  // Filter cards by type for better UX
  const debitCards = cards.filter(
    (card) =>
      card.cardType === "DEBIT" ||
      card.cardType === "CASH" ||
      card.cardType === "BUSINESS_DEBIT",
  );
  const creditCards = cards.filter(
    (card) => card.cardType === "CREDIT" || card.cardType === "BUSINESS_CREDIT",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingTransaction ? "Edit Card Payment" : "Pay Credit Card"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Budget *
            </label>
            <select
              value={formData.budgetId}
              onChange={(e) => handleInputChange("budgetId", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a budget</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              From (Debit/Cash Card) *
            </label>
            <select
              value={formData.fromCardId}
              onChange={(e) => handleInputChange("fromCardId", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select source card</option>
              {debitCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.cardType})
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select destination card</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.cardType})
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
              {isSubmitting || createCardPaymentMutation.isPending ? (
                <LoadingSpinner message="" className="h-4" logoSize="sm" />
              ) : editingTransaction ? (
                "Update Payment"
              ) : (
                "Create Payment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
