"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { CategoryType } from "@prisma/client";
import Button from "../Button";
import { useCreateBudgetCategory } from "@/lib/data-hooks/budgets/useBudgetCategories";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";
import type { BudgetCategoryWithCategory } from "@/lib/types/budget";

const GROUP_LABELS: Record<CategoryType, string> = {
  NEEDS: "Needs",
  WANTS: "Wants",
  INVESTMENT: "Investment",
};

interface NewCategoryInlineProps {
  budgetId: string;
  /** Names already in this budget, used to block an accidental duplicate. */
  existingNames: string[];
  onCreated: (category: BudgetCategoryWithCategory) => void;
  onCancel: () => void;
  onUpgradeRequired: (reason: string) => void;
}

/**
 * Compact "add a category without leaving the transaction form" panel. Renders
 * as a plain <div> (never a <form>) because it lives inside `TransactionForm`'s
 * form element — nested forms are invalid HTML, so Enter is handled manually
 * and every button is explicitly `type="button"`.
 *
 * The name is a plain text input rather than a combobox: `createBudgetCategory`
 * already matches an existing template case-insensitively server-side, so
 * typing "groceries" links to the existing "Groceries" template.
 */
export default function NewCategoryInline({
  budgetId,
  existingNames,
  onCreated,
  onCancel,
  onUpgradeRequired,
}: NewCategoryInlineProps) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<CategoryType>(CategoryType.WANTS);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: createBudgetCategory, isPending } =
    useCreateBudgetCategory();

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Category name is required");
      return;
    }

    if (
      existingNames.some(
        (existing) => existing.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setError("That category is already in this budget");
      return;
    }

    // An empty amount means no allocation yet, which the API now accepts.
    const allocatedAmount = parseFloat(amount) || 0;
    if (allocatedAmount < 0) {
      setError("Allocated amount must be 0 or greater");
      return;
    }

    setError(null);

    try {
      const created = await createBudgetCategory({
        budgetId,
        data: { categoryName: trimmedName, group, allocatedAmount },
      });

      // The POST returns the bare category row, so fill in the fields the
      // category selects read before the budget-categories refetch lands.
      onCreated({ ...created, spentAmount: 0, transactions: [] });
      toast.success(`"${created.name}" added to this budget`);
    } catch (err) {
      if (err instanceof UpgradeRequiredError) {
        onUpgradeRequired(err.message);
        return;
      }
      console.error("Failed to create budget category:", err);
      setError("Failed to create category. Please try again.");
    }
  };

  return (
    <div
      className="mt-2 rounded-xl border border-secondary-300 bg-secondary-50 p-3"
      onKeyDown={(e) => {
        // Swallow Enter so it never submits the surrounding transaction form.
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          void handleSave();
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">New category</span>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          aria-label="Cancel new category"
          className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Category name"
          autoFocus
          disabled={isPending}
          aria-label="New category name"
          className="w-full flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as CategoryType)}
          disabled={isPending}
          aria-label="New category group"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:w-32"
        >
          {Object.entries(GROUP_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="relative w-full sm:w-28">
          <span className="absolute left-2.5 top-2 text-sm text-gray-500">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            placeholder="0.00"
            disabled={isPending}
            aria-label="New category allocated amount"
            className="w-full rounded-md border border-gray-300 py-2 pl-6 pr-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => void handleSave()}
          isLoading={isPending}
          className="min-h-[44px]"
        >
          <Check className="mr-1 h-4 w-4" />
          Add category
        </Button>
      </div>
    </div>
  );
}
