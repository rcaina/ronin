"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { useUpdateTransaction } from "@/lib/data-hooks/transactions/useTransactions";
import {
  useBudgetCategories,
  type BudgetCategoryWithCategory,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import type {
  UpdateTransactionRequest,
  TransactionWithRelations,
} from "@/lib/types/transaction";
import type { Card } from "@/lib/data-hooks/services/cards";
import Button from "../Button";

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

interface InlineTransactionEditProps {
  transaction: TransactionWithRelations;
  onCancel: () => void;
  onSuccess: () => void;
  getGroupColor: (group: string) => string;
  formatCurrency: (amount: number) => string;
}

export default function InlineTransactionEdit({
  transaction,
  onCancel,
  onSuccess,
  getGroupColor,
}: InlineTransactionEditProps) {
  const { mutate: updateTransaction, isPending: isUpdating } =
    useUpdateTransaction();
  const { data: cards = [] } = useCards();
  const { data: budgets = [] } = useBudgets();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      name: transaction.name ?? "",
      description: transaction.description ?? "",
      amount: Math.abs(transaction.amount).toString(),
      budgetId: transaction.budgetId,
      categoryId: transaction.categoryId ?? undefined,
      cardId: transaction.cardId ?? "",
      isReturn: transaction.amount < 0,
      occurredAt: transaction.occurredAt
        ? transaction.occurredAt instanceof Date
          ? transaction.occurredAt.toISOString().split("T")[0]
          : new Date(transaction.occurredAt).toISOString().split("T")[0]
        : undefined,
    },
  });

  const selectedBudgetId = watch("budgetId");
  const { data: budgetCategories = [] } = useBudgetCategories(
    selectedBudgetId || transaction.budgetId,
  );

  const onSubmit = (data: TransactionFormData) => {
    // Convert amount to negative if it's a return/refund
    const amount = data.isReturn
      ? -Math.abs(parseFloat(data.amount))
      : Math.abs(parseFloat(data.amount));

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
          onSuccess();
        },
        onError: (error: unknown) => {
          console.error("Failed to update transaction:", error);
          toast.error("Failed to update transaction. Please try again.");
        },
      },
    );
  };

  return (
    <div className="group flex items-center justify-between bg-blue-50 px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 flex-1 items-center space-x-3 sm:space-x-4">
        <div
          className={`h-3 w-3 flex-shrink-0 rounded-full ${getGroupColor(transaction.category?.category.group ?? "regular")}`}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-3">
          {/* First row: Name and Amount */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500">Label</div>
              <input
                type="text"
                {...register("name")}
                placeholder="Transaction name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center space-x-2">
              <div>
                <div className="text-xs text-gray-500">Amount</div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    {...register("amount")}
                    placeholder="0.00"
                    step="0.01"
                    className={`w-24 rounded-md border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 ${
                      errors.amount
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  {...register("isReturn")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isUpdating}
                />
                <span className="text-xs text-gray-600">Return</span>
              </label>
            </div>
          </div>

          {/* Second row: Budget and Category */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500">Budget</div>
              <select
                {...register("budgetId")}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.budgetId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isUpdating}
              >
                <option value="">Select a budget</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
              {errors.budgetId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.budgetId.message}
                </p>
              )}
            </div>

            <div className="flex-1">
              <div className="text-xs text-gray-500">Category</div>
              <select
                {...register("categoryId")}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.categoryId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                disabled={isUpdating}
              >
                <option value="">Select a category</option>
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
                {/* Show current category if it's not in the current budget categories */}
                {transaction.category &&
                  !budgetCategories.some(
                    (bc) => bc.id === transaction.categoryId,
                  ) && (
                    <option value={transaction.categoryId ?? ""}>
                      {transaction.category.category.name} (current category)
                    </option>
                  )}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          </div>

          {/* Third row: Date and Card */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500">Date</div>
              <input
                type="date"
                {...register("occurredAt")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isUpdating}
              />
            </div>

            <div className="flex-1">
              <div className="text-xs text-gray-500">Card</div>
              <select
                {...register("cardId")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isUpdating}
              >
                <option value="">No card</option>
                {cards.map((card: Card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.cardType}) - {card.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fourth row: Description */}
          <div className="flex-1">
            <div className="text-xs text-gray-500">Description</div>
            <textarea
              {...register("description")}
              placeholder="Description (optional)"
              rows={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isUpdating}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2">
            <Button
              type="button"
              onClick={onCancel}
              disabled={isUpdating}
              variant="outline"
              size="sm"
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              variant="primary"
              size="sm"
            >
              {isUpdating ? (
                <>
                  <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
