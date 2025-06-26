"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check } from "lucide-react";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "@/lib/data-hooks/transactions/useTransactions";
import {
  useBudgetCategories,
  type BudgetCategoryWithCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import type {
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionWithRelations,
} from "@/lib/data-hooks/services/transactions";
import type { Card } from "@/lib/data-hooks/services/cards";
import Button from "../Button";

// Validation schema
const transactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount is required and must be greater than 0"),
  budgetId: z.string().min(1, "Budget is required"),
  categoryId: z.string().min(1, "Category is required"),
  cardId: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: TransactionWithRelations; // For editing
}

export default function TransactionForm({
  onClose,
  onSuccess,
  transaction,
}: TransactionFormProps) {
  const { mutate: createTransaction, isPending: isCreating } =
    useCreateTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } =
    useUpdateTransaction();
  const { data: budgets = [] } = useBudgets();
  const { data: cards = [] } = useCards();

  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const { data: budgetCategories = [] } = useBudgetCategories(selectedBudgetId);

  const isEditing = !!transaction;
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      budgetId: "",
      categoryId: "",
      cardId: "",
    },
  });

  const watchedBudgetId = watch("budgetId");

  // Update selected budget when form budget changes
  useEffect(() => {
    setSelectedBudgetId(watchedBudgetId);
  }, [watchedBudgetId]);

  // Initialize form data when editing
  useEffect(() => {
    if (transaction) {
      setValue("name", transaction.name ?? "");
      setValue("description", transaction.description ?? "");
      setValue("amount", transaction.amount.toString());
      setValue("budgetId", transaction.budgetId);
      setValue("categoryId", transaction.categoryId);
      setValue("cardId", transaction.cardId ?? "");
      setSelectedBudgetId(transaction.budgetId);
    }
  }, [transaction, setValue]);

  const onSubmit = (data: TransactionFormData) => {
    if (isEditing && transaction) {
      const updateData: UpdateTransactionRequest = {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        amount: parseFloat(data.amount),
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        cardId: data.cardId ?? undefined,
      };

      updateTransaction(
        { id: transaction.id, data: updateData },
        {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
          onError: (error: unknown) => {
            console.error("Failed to update transaction:", error);
          },
        },
      );
    } else {
      const transactionData: CreateTransactionRequest = {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        amount: parseFloat(data.amount),
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        cardId: data.cardId ?? undefined,
      };

      createTransaction(transactionData, {
        onSuccess: () => {
          // Reset form for adding multiple transactions
          reset();
          onSuccess?.();
        },
        onError: (error: unknown) => {
          console.error("Failed to create transaction:", error);
        },
      });
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Transaction" : "Add Transaction"}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                {...register("name")}
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
                  {...register("amount")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-md border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 ${
                    errors.amount
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  disabled={isPending}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.amount.message}
                </p>
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
                {...register("budgetId")}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.budgetId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isPending}
              >
                <option value="">Select a budget</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
              {errors.budgetId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.budgetId.message}
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
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
                {...register("categoryId")}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.categoryId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isPending}
              >
                <option value="">Select a category</option>
                {budgetCategories.map(
                  (budgetCategory: BudgetCategoryWithCategory) => (
                    <option key={budgetCategory.id} value={budgetCategory.id}>
                      {budgetCategory.category.name}
                    </option>
                  ),
                )}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.categoryId.message}
                </p>
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
                {...register("cardId")}
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
                {...register("description")}
                placeholder="Additional details about this transaction"
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <Button onClick={onClose} disabled={isPending} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} variant="primary">
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {isEditing ? "Updating..." : "Adding..."}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isEditing ? "Update Transaction" : "Add Transaction"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
