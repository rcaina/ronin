"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { useCreateTransaction } from "@/lib/data-hooks/transactions/useTransactions";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import type { CreateTransactionRequest } from "@/lib/data-hooks/services/transactions";
import type { Card } from "@/lib/data-hooks/services/cards";

interface TransactionFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface TransactionFormData {
  name: string;
  description: string;
  amount: string;
  budgetId: string;
  categoryId: string;
  cardId: string;
}

export default function TransactionForm({
  onClose,
  onSuccess,
}: TransactionFormProps) {
  const { mutate: createTransaction, isPending } = useCreateTransaction();
  const { data: categories } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: cards = [] } = useCards();

  const [formData, setFormData] = useState<TransactionFormData>({
    name: "",
    description: "",
    amount: "",
    budgetId: "",
    categoryId: "",
    cardId: "",
  });

  const [errors, setErrors] = useState<Partial<TransactionFormData>>({});

  // Flatten categories from grouped structure
  const flattenedCategories = categories
    ? [...categories.wants, ...categories.needs, ...categories.investment]
    : [];

  const handleFormChange = (
    field: keyof TransactionFormData,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TransactionFormData> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount is required and must be greater than 0";
    }

    if (!formData.budgetId) {
      newErrors.budgetId = "Budget is required";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const transactionData: CreateTransactionRequest = {
      name: formData.name || undefined,
      description: formData.description || undefined,
      amount: parseFloat(formData.amount),
      budgetId: formData.budgetId,
      categoryId: formData.categoryId,
      cardId: formData.cardId || undefined,
    };

    createTransaction(transactionData, {
      onSuccess: () => {
        // Reset form for adding multiple transactions
        setFormData({
          name: "",
          description: "",
          amount: "",
          budgetId: "",
          categoryId: "",
          cardId: "",
        });
        setErrors({});
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error("Failed to create transaction:", error);
        // You could add a toast notification here
      },
    });
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Transaction</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Transaction Name */}
            <div>
              <label
                htmlFor="transactionName"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Transaction Name (Optional)
              </label>
              <input
                type="text"
                id="transactionName"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g., Grocery shopping, Gas station"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isPending}
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => handleFormChange("amount", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-md border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 ${
                    errors.amount
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  disabled={isPending}
                  required
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            {/* Budget Selection */}
            <div>
              <label
                htmlFor="budgetId"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Budget <span className="text-red-500">*</span>
              </label>
              <select
                id="budgetId"
                value={formData.budgetId}
                onChange={(e) => handleFormChange("budgetId", e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.budgetId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isPending}
                required
              >
                <option value="">Select a budget</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
              {errors.budgetId && (
                <p className="mt-1 text-sm text-red-600">{errors.budgetId}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleFormChange("description", e.target.value)
                }
                placeholder="Additional details about this transaction"
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isPending}
              />
            </div>

            {/* Category Selection */}
            <div>
              <label
                htmlFor="categoryId"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => handleFormChange("categoryId", e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.categoryId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isPending}
                required
              >
                <option value="">Select a category</option>
                {flattenedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
              )}
            </div>

            {/* Card Selection */}
            <div>
              <label
                htmlFor="cardId"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Payment Method (Optional)
              </label>
              <select
                id="cardId"
                value={formData.cardId}
                onChange={(e) => handleFormChange("cardId", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isPending}
              >
                <option value="">Select a payment method</option>
                {cards.map((card: Card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.cardType})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="hover:bg-secondary/80 flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Adding...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Add Transaction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
