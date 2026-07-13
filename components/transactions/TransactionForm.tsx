"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check, Info, Plus, Trash2, Repeat } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "@/lib/data-hooks/transactions/useTransactions";
import { useBudgetCategories } from "@/lib/data-hooks/budgets/useBudgetCategories";
import type { BudgetCategoryWithCategory } from "@/lib/types/budget";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import { useBillingStatus } from "@/lib/data-hooks/billing/useBilling";
import { useCreateRecurringTransaction } from "@/lib/data-hooks/recurring/useRecurring";
import { runRecurringCatchUp } from "@/lib/data-hooks/services/recurring";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionWithRelations,
} from "@/lib/types/transaction";
import type { Card } from "@/lib/types/card";
import Button from "../Button";
import DateInput from "../DateInput";
import UpgradeModal from "../UpgradeModal";
import { formatCurrency, roundToCents } from "@/lib/utils";
import {
  isDebitCard as isDebitCardType,
  oldestDebitCard,
} from "@/lib/utils/cards";
import { CardType, PeriodType, TransactionType } from "@prisma/client";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";

// Mirrors the server-side reason string from `canSplitTransactions` in
// `lib/utils/entitlements.ts`, shown when a free user tries to enable split
// mode client-side (a real 402 with the same message is caught as a safety
// net on submit — see `onSubmit`).
const SPLIT_UPGRADE_REASON =
  "Splitting a transaction across categories is a Premium feature. Upgrade to Premium to split transactions.";

// Mirrors the server-side reason string from `canCreateRecurring` in
// `lib/utils/entitlements.ts`.
const RECURRING_UPGRADE_REASON =
  "Recurring transactions are a Premium feature. Upgrade to Premium to automate repeating transactions.";

const FREQUENCY_LABELS: Record<PeriodType, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  ONE_TIME: "One time",
};

// A single row in the split editor. Kept as free-form string state (like the
// rest of this form's amount input) rather than react-hook-form fields, since
// rows are added/removed dynamically and only need to be assembled into the
// `splits` payload on submit.
interface SplitRowState {
  key: string;
  categoryId: string;
  amount: string;
  note: string;
}

const makeEmptySplitRow = (): SplitRowState => ({
  key:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  categoryId: "",
  amount: "",
  note: "",
});

// Validation schema
const transactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Amount is required and must be 0 or greater"),
  budgetId: z.string().min(1, "Budget is required"),
  categoryId: z.string().optional(), // Optional for income transactions
  occurredAt: z.string().optional(),
  cardId: z.string().optional(),
  transactionType: z.nativeEnum(TransactionType),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: TransactionWithRelations; // For editing
  budgetId?: string; // For pre-selecting a budget
  cardId?: string; // For pre-selecting a card
  isIncome?: boolean; // If true, this is an income transaction
}

export default function TransactionForm({
  onClose,
  onSuccess,
  transaction,
  budgetId,
  cardId,
  isIncome = false,
}: TransactionFormProps) {
  const { mutate: createTransaction, isPending: isCreating } =
    useCreateTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } =
    useUpdateTransaction();
  const { mutate: createRecurringTransaction, isPending: isCreatingRecurring } =
    useCreateRecurringTransaction();
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useBudgets();
  const { data: cards = [] } = useCards(undefined, budgetId);
  const { data: billingStatus } = useBillingStatus();
  const isPremium = billingStatus?.isPremium ?? false;

  // Income transactions can only be deposited to a debit-type card.
  const debitCards = useMemo(() => cards.filter(isDebitCardType), [cards]);
  // The list of cards to show in the "Payment Method" select.
  const cardOptions = isIncome ? debitCards : cards;

  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const { data: budgetCategories = [] } = useBudgetCategories(selectedBudgetId);
  const isEditing = !!transaction;
  const isPending = isCreating || isUpdating || isCreatingRecurring;

  // Split-across-categories editing state.
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRowState[]>([]);
  // Paywall shown when a free user tries to enable split mode, or (as a
  // safety net) if a split payload somehow reaches the server anyway.
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  // "Make recurring" — creates a RecurringTransaction template instead of a
  // one-off Transaction (see lib/api-services/recurring.ts). Only offered
  // when creating (not editing) and outside split mode, since templates
  // don't support splits.
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<PeriodType>(
    PeriodType.MONTHLY,
  );
  const [recurringEndAt, setRecurringEndAt] = useState("");
  const canMakeRecurring = !isEditing && !isSplitMode;

  const handleToggleRecurring = (checked: boolean) => {
    if (checked && !isPremium) {
      setUpgradeReason(RECURRING_UPGRADE_REASON);
      return;
    }
    setIsRecurring(checked);
  };

  // Track if we've already shown the success toast for the current mutation
  const hasShownSuccessToastRef = useRef(false);

  // Tracks whether the edited transaction's card has been applied to the
  // select once its <option> exists (see the re-apply effect below).
  const hasAppliedEditCardRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
    getValues,
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
      transactionType: isIncome
        ? TransactionType.INCOME
        : TransactionType.REGULAR,
    },
  });

  const watchedBudgetId = watch("budgetId");
  const watchedCardId = watch("cardId");
  const watchedTransactionType = watch("transactionType");

  // Update selected budget when form budget changes
  useEffect(() => {
    setSelectedBudgetId(watchedBudgetId);
  }, [watchedBudgetId]);

  // Determine if the selected card is a credit card
  const selectedCard = cards.find((card) => card.id === watchedCardId);
  const isCreditCard =
    selectedCard &&
    (selectedCard.cardType === CardType.CREDIT ||
      selectedCard.cardType === CardType.BUSINESS_CREDIT);

  // Determine if the selected card is a debit card (for income)
  const isDebitCard = selectedCard && isDebitCardType(selectedCard);

  // Determine if current transaction type is income
  const isIncomeTransaction = watchedTransactionType === TransactionType.INCOME;

  // Splits are only supported for REGULAR/RETURN transactions (never income).
  const canSplit = !isIncome && !isIncomeTransaction;

  // Set form values when editing
  useEffect(() => {
    if (transaction) {
      setValue("name", transaction.name ?? "");
      setValue("description", transaction.description ?? "");
      setValue("amount", Math.abs(transaction.amount).toString());
      setValue("budgetId", transaction.budgetId);
      setValue("categoryId", transaction.categoryId ?? "");
      setValue("cardId", transaction.cardId ?? "");
      setValue("transactionType", transaction.transactionType);
      setValue(
        "occurredAt",
        transaction.occurredAt
          ? transaction.occurredAt instanceof Date
            ? transaction.occurredAt.toISOString().split("T")[0]
            : new Date(transaction.occurredAt).toISOString().split("T")[0]
          : undefined,
      );
      setSelectedBudgetId(transaction.budgetId);
      if (transaction.splits && transaction.splits.length > 0) {
        setIsSplitMode(true);
        setSplitRows(
          transaction.splits.map((split) => ({
            key: split.id,
            categoryId: split.categoryId,
            amount: split.amount.toString(),
            note: split.note ?? "",
          })),
        );
      }
    } else {
      if (budgetId) {
        setValue("budgetId", budgetId);
        setSelectedBudgetId(budgetId);
      }
      // Set default transaction type based on isIncome prop
      setValue(
        "transactionType",
        isIncome ? TransactionType.INCOME : TransactionType.REGULAR,
      );
    }
  }, [transaction, budgetId, isIncome, setValue]);

  // Splits only make sense for REGULAR/RETURN transactions — if the user
  // switches the transaction type to Income while split mode is on, drop
  // back to single-category mode rather than leaving an invalid combination.
  useEffect(() => {
    if (!canSplit && isSplitMode) {
      setIsSplitMode(false);
    }
  }, [canSplit, isSplitMode]);

  // "Make recurring" is only offered while creating (not editing) and
  // outside split mode — turn it off if either becomes true mid-edit.
  useEffect(() => {
    if (!canMakeRecurring && isRecurring) {
      setIsRecurring(false);
    }
  }, [canMakeRecurring, isRecurring]);

  const handleToggleSplitMode = (checked: boolean) => {
    if (checked && !isPremium) {
      setUpgradeReason(SPLIT_UPGRADE_REASON);
      return;
    }
    setIsSplitMode(checked);
    if (checked) {
      setSplitRows((rows) => {
        if (rows.length >= 2) return rows;
        const needed = 2 - rows.length;
        return [
          ...rows,
          ...Array.from({ length: needed }, () => makeEmptySplitRow()),
        ];
      });
    }
  };

  const addSplitRow = () => {
    setSplitRows((rows) => [...rows, makeEmptySplitRow()]);
  };

  const removeSplitRow = (key: string) => {
    setSplitRows((rows) => rows.filter((row) => row.key !== key));
  };

  const updateSplitRow = (key: string, patch: Partial<SplitRowState>) => {
    setSplitRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const watchedAmount = watch("amount");
  const totalAmount = roundToCents(parseFloat(watchedAmount || "0") || 0);
  const allocatedAmount = roundToCents(
    splitRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
  );
  const remainingAmount = roundToCents(totalAmount - allocatedAmount);
  const splitRowsHaveCategoryAndAmount = splitRows.every(
    (row) => row.categoryId !== "" && parseFloat(row.amount) > 0,
  );
  const isSplitAllocationValid =
    splitRows.length >= 2 &&
    splitRowsHaveCategoryAndAmount &&
    totalAmount > 0 &&
    Math.abs(remainingAmount) < 0.005;

  // Default the payment method once the (filtered) card list has actually
  // loaded. This effect is keyed on `cards`/`debitCards` so it re-runs when
  // the cards query resolves, fixing the case where the modal is opened for
  // the first time with a cold query cache (the select's <option> elements
  // don't exist yet when the editing-flow effect above runs, so setValue has
  // nothing to match against). It never overwrites a value the user already
  // picked.
  useEffect(() => {
    if (transaction) return; // editing flow is handled separately above
    if (getValues("cardId")) return; // don't clobber an existing selection
    if (cardOptions.length === 0) return; // nothing loaded yet to default to

    const propCard = cardId
      ? cardOptions.find((card) => card.id === cardId)
      : undefined;

    if (propCard) {
      setValue("cardId", propCard.id);
      return;
    }

    if (isIncome && debitCards.length > 0) {
      const defaultDebitCard = oldestDebitCard(debitCards);
      if (defaultDebitCard) {
        setValue("cardId", defaultDebitCard.id);
      }
    }
  }, [
    cardOptions,
    debitCards,
    isIncome,
    cardId,
    transaction,
    setValue,
    getValues,
  ]);

  // Editing has the same cold-cache problem as above: the edit effect sets
  // cardId before the cards query resolves, so the select has no matching
  // <option> and renders empty. Re-apply the transaction's card once its
  // option exists — exactly once, so a card the user picks mid-edit is never
  // clobbered by a background cards refetch.
  useEffect(() => {
    if (!transaction?.cardId || hasAppliedEditCardRef.current) return;
    if (cardOptions.some((card) => card.id === transaction.cardId)) {
      setValue("cardId", transaction.cardId);
      hasAppliedEditCardRef.current = true;
    }
  }, [cardOptions, transaction, setValue]);

  const onSubmit = (data: TransactionFormData) => {
    // "Make recurring" creates a RecurringTransaction template instead of a
    // one-off Transaction — the budget doesn't apply (occurrences resolve
    // their own budget by date at post time), but everything else about the
    // entered transaction carries over as the template.
    if (canMakeRecurring && isRecurring) {
      createRecurringTransaction(
        {
          name: data.name ?? undefined,
          description: data.description ?? undefined,
          amount: Math.abs(parseFloat(data.amount)),
          categoryId:
            data.categoryId && data.categoryId.trim() !== ""
              ? data.categoryId
              : undefined,
          cardId: data.cardId ?? undefined,
          transactionType: data.transactionType,
          frequency: recurringFrequency,
          nextRunAt: (data.occurredAt
            ? new Date(data.occurredAt)
            : new Date()
          ).toISOString(),
          endAt: recurringEndAt
            ? new Date(recurringEndAt).toISOString()
            : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Recurring transaction created!");
            // Post the first occurrence right away if it's already due
            // (e.g. start date is today or in the past) — otherwise the
            // user would have to wait for the next cron/catch-up run to see
            // anything in their transaction list.
            runRecurringCatchUp()
              .then((result) => {
                if (result.posted > 0) {
                  void queryClient.invalidateQueries({
                    queryKey: ["transactions"],
                  });
                  void queryClient.invalidateQueries({
                    queryKey: ["allTransactions"],
                  });
                  void queryClient.invalidateQueries({ queryKey: ["budget"] });
                  void queryClient.invalidateQueries({ queryKey: ["budgets"] });
                }
              })
              .catch((error: unknown) => {
                console.error("Recurring catch-up failed:", error);
              });
            onSuccess?.();
            onClose();
          },
          onError: (error: unknown) => {
            if (error instanceof UpgradeRequiredError) {
              setUpgradeReason(error.message);
              return;
            }
            console.error("Failed to create recurring transaction:", error);
            toast.error(
              "Failed to create recurring transaction. Please try again.",
            );
          },
        },
      );
      return;
    }

    // When split mode is on and valid, build the splits payload and omit
    // categoryId entirely (the server clears/ignores it when splits are
    // present — see lib/api-schemas/transactions.ts).
    const splitsPayload =
      isSplitMode && isSplitAllocationValid
        ? splitRows.map((row) => ({
            categoryId: row.categoryId,
            amount: roundToCents(Math.abs(parseFloat(row.amount))),
            note: row.note.trim() ? row.note.trim() : undefined,
          }))
        : undefined;

    if (isEditing && transaction) {
      const updateData: UpdateTransactionRequest = {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        amount: Math.abs(parseFloat(data.amount)),
        budgetId: data.budgetId,
        categoryId: splitsPayload
          ? undefined
          : data.categoryId && data.categoryId.trim() !== ""
            ? data.categoryId
            : undefined,
        cardId: data.cardId ?? undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
        transactionType: data.transactionType,
        splits: splitsPayload,
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
            if (error instanceof UpgradeRequiredError) {
              setUpgradeReason(error.message);
              return;
            }
            console.error("Failed to update transaction:", error);
            toast.error("Failed to update transaction. Please try again.");
          },
        },
      );
    } else {
      const transactionData: CreateTransactionRequest = {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        amount: Math.abs(parseFloat(data.amount)),
        budgetId: data.budgetId,
        categoryId: splitsPayload
          ? undefined
          : data.categoryId && data.categoryId.trim() !== ""
            ? data.categoryId
            : undefined,
        cardId: data.cardId ?? undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
        transactionType: data.transactionType,
        splits: splitsPayload,
      };

      // Reset the toast flag when starting a new mutation
      hasShownSuccessToastRef.current = false;

      createTransaction(transactionData, {
        onSuccess: () => {
          // Only show toast if we haven't shown it for this mutation yet
          if (!hasShownSuccessToastRef.current) {
            hasShownSuccessToastRef.current = true;
            toast.success("Transaction created successfully!");
          }
          // Reset form for adding multiple transactions, maintaining isIncome default
          reset({
            name: "",
            description: "",
            amount: "",
            budgetId: budgetId ?? "",
            categoryId: "",
            cardId: cardId ?? "",
            occurredAt: undefined,
            transactionType: isIncome
              ? TransactionType.INCOME
              : TransactionType.REGULAR,
          });
          setIsSplitMode(false);
          setSplitRows([]);
          onSuccess?.();
        },
        onError: (error: unknown) => {
          if (error instanceof UpgradeRequiredError) {
            setUpgradeReason(error.message);
            return;
          }
          console.error("Failed to create transaction:", error);
          toast.error("Failed to create transaction. Please try again.");
        },
      });
    }
  };

  return (
    <div className="rounded-xl border bg-surface-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing
            ? "Edit Transaction"
            : isIncome
              ? "Add New Income"
              : "Add Transaction"}
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
                    : "border-gray-300 focus:border-secondary focus:ring-secondary"
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

          {/* Transaction Type */}
          <div>
            <label
              htmlFor="transactionType"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <select
              id="transactionType"
              {...register("transactionType")}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.transactionType
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-secondary focus:ring-secondary"
              }`}
              disabled={isPending}
            >
              {/* Editing income keeps the type locked: the category field is
                  hidden in income mode, so switching to Regular/Return here
                  would save an uncategorized spending transaction. */}
              {isIncome && isEditing ? (
                <option value={TransactionType.INCOME}>Income</option>
              ) : (
                <>
                  <option value={TransactionType.REGULAR}>Regular</option>
                  {((isDebitCard ?? false) || (isIncome ?? false)) && (
                    <option value={TransactionType.INCOME}>Income</option>
                  )}
                  <option value={TransactionType.RETURN}>
                    {isCreditCard ? "Refund" : "Return"}
                  </option>
                </>
              )}
            </select>
            {errors.transactionType && (
              <p className="mt-1 text-sm text-red-600">
                {errors.transactionType.message}
              </p>
            )}
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
                    : "border-gray-300 focus:border-secondary focus:ring-secondary"
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

          {/* Category Selection - hidden for income */}
          {!isIncome && (
            <div className={isSplitMode ? "sm:col-span-2" : undefined}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label
                  htmlFor="categoryId"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <span>
                    Category{" "}
                    {!isIncomeTransaction && !isSplitMode && (
                      <span className="text-red-500">*</span>
                    )}
                  </span>
                  {!selectedBudgetId && !isSplitMode && (
                    <div className="group relative">
                      <Info className="h-4 w-4 text-secondary-600" />
                      <div className="absolute bottom-full left-0 mb-2 hidden w-64 rounded-lg bg-primary-950 p-2 text-xs text-white group-hover:block">
                        Select a budget to see available categories.
                      </div>
                    </div>
                  )}
                </label>
                {canSplit &&
                  (isPremium ? (
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-medium text-gray-600">
                      <span className="hidden sm:inline">
                        Split across categories
                      </span>
                      <span className="sm:hidden">Split</span>
                      <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                        <input
                          type="checkbox"
                          checked={isSplitMode}
                          onChange={(e) =>
                            handleToggleSplitMode(e.target.checked)
                          }
                          disabled={isPending}
                          className="peer sr-only"
                        />
                        <span className="absolute inset-0 rounded-full bg-gray-200 transition-colors duration-200 peer-checked:bg-secondary" />
                        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-200 peer-checked:translate-x-5" />
                      </span>
                    </label>
                  ) : (
                    // Free tier: the switch is genuinely disabled (AT announces
                    // its disabled state honestly), and the upgrade action lives
                    // on a separate, clearly-labelled button so activating it is
                    // never a silent no-op.
                    <div className="flex min-h-[44px] items-center gap-2 text-xs font-medium text-gray-600">
                      <span className="hidden sm:inline">
                        Split across categories
                      </span>
                      <span className="sm:hidden">Split</span>
                      <button
                        type="button"
                        onClick={() => setUpgradeReason(SPLIT_UPGRADE_REASON)}
                        aria-label="Upgrade to Premium to split transactions"
                        className="inline-flex items-center rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700 transition-colors hover:bg-secondary-200"
                      >
                        Premium
                      </button>
                      <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center opacity-50">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          readOnly
                          aria-label="Split across categories"
                          className="peer sr-only"
                        />
                        <span className="absolute inset-0 rounded-full bg-gray-200" />
                        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-soft" />
                      </span>
                    </div>
                  ))}
              </div>

              {isSplitMode ? (
                <div className="space-y-2 rounded-xl border border-gray-200 bg-surface p-3">
                  {splitRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-surface-card p-2 sm:flex-row sm:items-center"
                    >
                      <select
                        value={row.categoryId}
                        onChange={(e) =>
                          updateSplitRow(row.key, {
                            categoryId: e.target.value,
                          })
                        }
                        disabled={isPending || !selectedBudgetId}
                        className="w-full flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:w-auto"
                      >
                        <option value="">Select category</option>
                        {budgetCategories.map(
                          (budgetCategory: BudgetCategoryWithCategory) => (
                            <option
                              key={budgetCategory.id}
                              value={budgetCategory.id}
                            >
                              {budgetCategory.name}
                            </option>
                          ),
                        )}
                      </select>
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) =>
                          updateSplitRow(row.key, { note: e.target.value })
                        }
                        placeholder="Note (optional)"
                        disabled={isPending}
                        className="w-full flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative w-28 flex-shrink-0">
                          <span className="absolute left-2.5 top-2 text-sm text-gray-500">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) =>
                              updateSplitRow(row.key, {
                                amount: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            disabled={isPending}
                            className="w-full rounded-md border border-gray-300 py-2 pl-6 pr-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSplitRow(row.key)}
                          disabled={isPending}
                          aria-label="Remove split"
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSplitRow}
                    disabled={isPending}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add split
                  </Button>

                  {/* Live allocation footer */}
                  <div className="flex flex-col gap-1 border-t border-gray-200 pt-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-gray-500">
                      Total {formatCurrency(totalAmount)} · Allocated{" "}
                      {formatCurrency(allocatedAmount)}
                    </span>
                    <span
                      className={`font-medium tabular-nums ${
                        Math.abs(remainingAmount) < 0.005
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Remaining {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="categoryId"
                    {...register("categoryId")}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      errors.categoryId
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : !selectedBudgetId && !isIncomeTransaction
                          ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500"
                          : "border-gray-300 focus:border-secondary focus:ring-secondary"
                    }`}
                    disabled={
                      isPending || (!selectedBudgetId && !isIncomeTransaction)
                    }
                  >
                    <option value="">
                      {!selectedBudgetId
                        ? "Please select a budget first"
                        : budgetCategories.length === 0
                          ? "No categories found for this budget"
                          : isEditing && transaction?.category
                            ? `${transaction.category.name}`
                            : "Select a category"}
                    </option>
                    {budgetCategories.map(
                      (budgetCategory: BudgetCategoryWithCategory) => {
                        const allocatedAmount =
                          budgetCategory.allocatedAmount ?? 0;
                        const spentAmount = budgetCategory.spentAmount ?? 0;
                        const availableAmount = allocatedAmount - spentAmount;
                        return (
                          <option
                            key={budgetCategory.id}
                            value={budgetCategory.id}
                          >
                            {budgetCategory.name} (
                            {formatCurrency(availableAmount)} available)
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
                          {transaction.category.name} (current category)
                        </option>
                      )}
                  </select>
                  {selectedBudgetId && budgetCategories.length === 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400" />
                        <div className="absolute bottom-full right-0 mb-2 hidden w-64 rounded-lg bg-primary-950 p-2 text-xs text-white group-hover:block">
                          No categories found for this budget. Please add
                          categories to your budget first.
                          <div className="absolute right-2 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {errors.categoryId && !isSplitMode && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          )}

          {/* Occurred At */}
          <div className="min-w-0">
            <label
              htmlFor="occurredAt"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Occurred At (Optional)
            </label>
            <DateInput
              id="occurredAt"
              {...register("occurredAt")}
              disabled={isPending}
            />
          </div>

          {/* Card Selection - when creating, a single available debit card is
              auto-selected (see the defaulting effect above), so just show it
              read-only instead of a select with one option. Editing always
              uses the registered select so the display matches `cardId`. */}
          {!isEditing && isIncome && debitCards.length === 1 ? (
            <div>
              <p className="mb-1 block text-xs font-medium text-gray-500">
                Payment method
              </p>
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {debitCards[0]?.name}
                {debitCards[0]?.lastFourDigits
                  ? ` •••• ${debitCards[0].lastFourDigits}`
                  : ""}
              </div>
            </div>
          ) : (
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              >
                <option value="">Select a payment method</option>
                {cardOptions.map((card: Card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.cardType}) - {card.user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Make recurring — creates a RecurringTransaction template instead
            of a one-off transaction. Only offered when creating (not
            editing) and outside split mode (see canMakeRecurring). */}
        {canMakeRecurring && (
          <div className="rounded-xl border border-gray-200 bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <Repeat className="h-4 w-4 text-gray-500" />
                <span>Make this a recurring transaction</span>
              </label>
              {isPremium ? (
                <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => handleToggleRecurring(e.target.checked)}
                    disabled={isPending}
                    aria-label="Make this a recurring transaction"
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-gray-200 transition-colors duration-200 peer-checked:bg-secondary" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-200 peer-checked:translate-x-5" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setUpgradeReason(RECURRING_UPGRADE_REASON)}
                  aria-label="Upgrade to Premium to create recurring transactions"
                  className="inline-flex items-center rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700 transition-colors hover:bg-secondary-200"
                >
                  Premium
                </button>
              )}
            </div>

            {isRecurring && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Frequency
                  </label>
                  <select
                    value={recurringFrequency}
                    onChange={(e) =>
                      setRecurringFrequency(e.target.value as PeriodType)
                    }
                    disabled={isPending}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  >
                    {Object.values(PeriodType).map((period) => (
                      <option key={period} value={period}>
                        {FREQUENCY_LABELS[period]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Ends on (optional)
                  </label>
                  <DateInput
                    value={recurringEndAt}
                    onChange={(e) => setRecurringEndAt(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <p className="text-xs text-gray-500 sm:col-span-2">
                  The first occurrence posts using the &quot;Occurred At&quot;
                  date above (or today, if left blank). Future occurrences post
                  automatically into whichever budget covers their date.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <Button onClick={onClose} disabled={isPending} variant="outline">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || (isSplitMode && !isSplitAllocationValid)}
            variant="primary"
            isLoading={isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            {isRecurring && canMakeRecurring
              ? "Create recurring transaction"
              : isEditing
                ? "Update Transaction"
                : "Add Transaction"}
          </Button>
        </div>
      </form>

      {/* Upgrade paywall (free tier can't split a transaction across categories) */}
      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
      />
    </div>
  );
}
