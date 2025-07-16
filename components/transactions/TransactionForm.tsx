"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check, Info } from "lucide-react";
import { toast } from "react-hot-toast";
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
} from "@/lib/types/transaction";
import type { Card } from "@/lib/data-hooks/services/cards";
import Button from "../Button";
import { TransactionType } from "@prisma/client";

// Validation schema
const transactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Amount is required and must be 0 or greater"),
  budgetId: z.string().min(1, "Budget is required"),
  categoryId: z.string().min(1, "Category is required"),
  occurredAt: z.string().optional(),
  cardId: z.string().optional(),
  isReturn: z.boolean(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: TransactionWithRelations; // For editing
  budgetId?: string; // For pre-selecting a budget
  cardId?: string; // For pre-selecting a card
}

export default function TransactionForm({
  onClose,
  onSuccess,
  transaction,
  budgetId,
  cardId,
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
      budgetId: budgetId ?? "",
      categoryId: "",
      cardId: "",
      occurredAt: undefined,
      isReturn: false,
    },
  });

  const watchedBudgetId = watch("budgetId");
  const watchedCardId = watch("cardId");

  // Update selected budget when form budget changes
  useEffect(() => {
    setSelectedBudgetId(watchedBudgetId);
  }, [watchedBudgetId]);

  // Determine if the selected card is a credit card
  const selectedCard = cards.find((card) => card.id === watchedCardId);
  const isCreditCard =
    selectedCard &&
    (selectedCard.cardType === "CREDIT" ||
      selectedCard.cardType === "BUSINESS_CREDIT");

  // Initialize form data when editing or when budgetId/cardId is provided
  useEffect(() => {
    if (transaction) {
      setValue("name", transaction.name ?? "");
      setValue("description", transaction.description ?? "");
      setValue("amount", Math.abs(transaction.amount).toString());
      setValue("budgetId", transaction.budgetId);
      setValue("categoryId", transaction.categoryId ?? "");
      setValue("cardId", transaction.cardId ?? "");
      setValue("isReturn", transaction.amount < 0);
      setValue(
        "occurredAt",
        transaction.occurredAt
          ? transaction.occurredAt instanceof Date
            ? transaction.occurredAt.toISOString().split("T")[0]
            : new Date(transaction.occurredAt).toISOString().split("T")[0]
          : undefined,
      );
      setSelectedBudgetId(transaction.budgetId);
    } else {
      if (budgetId) {
        setValue("budgetId", budgetId);
        setSelectedBudgetId(budgetId);
      }
      if (cardId) {
        setValue("cardId", cardId);
      }
    }
  }, [transaction, budgetId, cardId, setValue]);

  const onSubmit = (data: TransactionFormData) => {
    let amount: number;
    if (isCreditCard) {
      // For credit cards: purchases should be negative (money going out), payments/returns should be positive
      amount = data.isReturn
        ? Math.abs(parseFloat(data.amount)) // Return/refund = positive (money back)
        : -Math.abs(parseFloat(data.amount)); // Purchase = negative (money going out)
    } else {
      // For debit/cash cards: purchases are positive, returns are negative
      amount = data.isReturn
        ? -Math.abs(parseFloat(data.amount)) // Return/refund = negative
        : Math.abs(parseFloat(data.amount)); // Purchase = positive
    }

    if (isEditing && transaction) {
      const updateData: UpdateTransactionRequest = {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        amount: amount,
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        cardId: data.cardId ?? undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      };

      updateTransaction(
        { id: transaction.id, data: updateData },
        {
          onSuccess: () => {
            toast.success("Transaction updated successfully!");
            onSuccess?.();
            onClose();
          },
          onError: (error: unknown) => {
            console.error("Failed to update transaction:", error);
            toast.error("Failed to update transaction. Please try again.");
          },
        },
      );
    } else {
      const transactionData: CreateTransactionRequest = {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        amount: amount,
        budgetId: data.budgetId,
        categoryId: data.categoryId ?? undefined,
        cardId: data.cardId ?? undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
        transactionType: TransactionType.REGULAR,
      };

      createTransaction(transactionData, {
        onSuccess: () => {
          toast.success("Transaction created successfully!");
          // Reset form for adding multiple transactions
          reset();
          onSuccess?.();
        },
        onError: (error: unknown) => {
          console.error("Failed to create transaction:", error);
          toast.error("Failed to create transaction. Please try again.");
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
        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {/* Transaction Name */}
          <div>
            <label
              htmlFor="transactionName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Transaction Label (Optional)
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

            {/* Return/Refund Toggle */}
            <div className="mt-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register("isReturn")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isPending}
                />
                <span className="text-sm text-gray-700">
                  {isCreditCard
                    ? "This is a payment or refund (money back to credit card)"
                    : "This is a return or refund (money back to account)"}
                </span>
              </label>
            </div>
          </div>

          {/* Budget Selection */}
          {!budgetId && (
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
          )}

          {/* Category Selection */}
          <div>
            <label
              htmlFor="categoryId"
              className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <span>
                Category <span className="text-red-500">*</span>
              </span>
              {!selectedBudgetId && (
                <div className="group relative">
                  <Info className="h-4 w-4 text-blue-500" />
                  <div className="absolute bottom-full left-0 mb-2 hidden w-64 rounded-lg bg-gray-900 p-2 text-xs text-white group-hover:block">
                    Select a budget to see available categories.
                  </div>
                </div>
              )}
            </label>
            <div className="relative">
              <select
                id="categoryId"
                {...register("categoryId")}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.categoryId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : !selectedBudgetId
                      ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isPending || !selectedBudgetId}
              >
                <option value="">
                  {!selectedBudgetId
                    ? "Please select a budget first"
                    : budgetCategories.length === 0
                      ? "No categories found for this budget"
                      : isEditing && transaction?.category
                        ? `${transaction.category.category.name}`
                        : "Select a category"}
                </option>
                {budgetCategories.map(
                  (budgetCategory: BudgetCategoryWithCategory) => {
                    const allocatedAmount = budgetCategory.allocatedAmount ?? 0;
                    const spentAmount = budgetCategory.spentAmount ?? 0;
                    const availableAmount = allocatedAmount - spentAmount;
                    return (
                      <option key={budgetCategory.id} value={budgetCategory.id}>
                        {budgetCategory.category.name} ($
                        {availableAmount.toFixed(2)} available)
                      </option>
                    );
                  },
                )}
                {/* Show current category if editing and it's not in the current budget categories */}
                {isEditing &&
                  transaction &&
                  transaction.category &&
                  !budgetCategories.some(
                    (bc) => bc.id === transaction.categoryId,
                  ) && (
                    <option value={transaction.categoryId ?? ""}>
                      {transaction.category.category.name} (current category)
                    </option>
                  )}
              </select>
              {selectedBudgetId && budgetCategories.length === 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="group relative">
                    <Info className="h-4 w-4 text-gray-400" />
                    <div className="absolute bottom-full right-0 mb-2 hidden w-64 rounded-lg bg-gray-900 p-2 text-xs text-white group-hover:block">
                      No categories found for this budget. Please add categories
                      to your budget first.
                      <div className="absolute right-2 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          {/* Occurred At */}
          <div>
            <label
              htmlFor="occurredAt"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Occurred At (Optional)
            </label>
            <input
              type="date"
              id="occurredAt"
              {...register("occurredAt")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isPending}
            />
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
                  {card.name} ({card.cardType}) - {card.user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description - spans full width */}
          <div className="sm:col-span-2">
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
