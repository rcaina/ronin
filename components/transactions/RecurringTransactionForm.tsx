"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../Modal";
import Button from "../Button";
import DateInput from "../DateInput";
import { useActiveBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useBudgetCategories } from "@/lib/data-hooks/budgets/useBudgetCategories";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import {
  useCreateRecurringTransaction,
  useUpdateRecurringTransaction,
} from "@/lib/data-hooks/recurring/useRecurring";
import type { RecurringTransactionWithRelations } from "@/lib/types/recurring";
import { PeriodType, TransactionType } from "@prisma/client";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";
import UpgradeModal from "../UpgradeModal";

const FREQUENCY_LABELS: Record<PeriodType, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  ONE_TIME: "One time",
};

const recurringSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount is required and must be greater than 0"),
  transactionType: z.nativeEnum(TransactionType),
  frequency: z.nativeEnum(PeriodType),
  nextRunAt: z.string().min(1, "Start date is required"),
  endAt: z.string().optional(),
  categoryId: z.string().optional(),
  cardId: z.string().optional(),
});

type RecurringFormData = z.infer<typeof recurringSchema>;

interface RecurringTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  template?: RecurringTransactionWithRelations;
}

const toDateInputValue = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split("T")[0]!;
};

export default function RecurringTransactionForm({
  isOpen,
  onClose,
  onSuccess,
  template,
}: RecurringTransactionFormProps) {
  const isEditing = !!template;
  const { mutate: createRecurring, isPending: isCreating } =
    useCreateRecurringTransaction();
  const { mutate: updateRecurring, isPending: isUpdating } =
    useUpdateRecurringTransaction();
  const isPending = isCreating || isUpdating;

  const { data: activeBudgets = [] } = useActiveBudgets();
  const { data: cards = [] } = useCards();
  const [referenceBudgetId, setReferenceBudgetId] = useState("");
  const { data: budgetCategories = [] } =
    useBudgetCategories(referenceBudgetId);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      transactionType: TransactionType.REGULAR,
      frequency: PeriodType.MONTHLY,
      nextRunAt: new Date().toISOString().split("T")[0],
      endAt: "",
      categoryId: "",
      cardId: "",
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    if (template) {
      setValue("name", template.name ?? "");
      setValue("description", template.description ?? "");
      setValue("amount", Math.abs(template.amount).toString());
      setValue("transactionType", template.transactionType);
      setValue("frequency", template.frequency);
      setValue("nextRunAt", toDateInputValue(template.nextRunAt));
      setValue("endAt", template.endAt ? toDateInputValue(template.endAt) : "");
      setValue("categoryId", template.categoryId ?? "");
      setValue("cardId", template.cardId ?? "");
    } else {
      reset({
        name: "",
        description: "",
        amount: "",
        transactionType: TransactionType.REGULAR,
        frequency: PeriodType.MONTHLY,
        nextRunAt: new Date().toISOString().split("T")[0],
        endAt: "",
        categoryId: "",
        cardId: "",
      });
      setReferenceBudgetId(activeBudgets[0]?.id ?? "");
    }
    // Only reset when the modal opens or the template being edited changes —
    // not on every activeBudgets refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, template, setValue, reset]);

  // A reference budget is only used to filter the category dropdown — the
  // template itself doesn't store a budgetId (see lib/api-schemas/recurring.ts).
  const currentCategoryStillListed = budgetCategories.some(
    (bc) => bc.id === template?.categoryId,
  );

  const onSubmit = (data: RecurringFormData) => {
    const payload = {
      name: data.name?.trim() ? data.name.trim() : undefined,
      description: data.description?.trim()
        ? data.description.trim()
        : undefined,
      amount: Math.abs(parseFloat(data.amount)),
      transactionType: data.transactionType,
      frequency: data.frequency,
      nextRunAt: new Date(data.nextRunAt).toISOString(),
      endAt: data.endAt ? new Date(data.endAt).toISOString() : undefined,
      categoryId: data.categoryId ?? undefined,
      cardId: data.cardId ?? undefined,
    };

    const onError = (error: unknown) => {
      if (error instanceof UpgradeRequiredError) {
        setUpgradeReason(error.message);
        return;
      }
      console.error("Failed to save recurring transaction:", error);
      toast.error("Failed to save recurring transaction. Please try again.");
    };

    if (isEditing && template) {
      updateRecurring(
        { id: template.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Recurring transaction updated!");
            onSuccess?.();
            onClose();
          },
          onError,
        },
      );
    } else {
      createRecurring(payload, {
        onSuccess: () => {
          toast.success("Recurring transaction created!");
          onSuccess?.();
          onClose();
        },
        onError,
      });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          isEditing ? "Edit recurring transaction" : "New recurring transaction"
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name (optional)
              </label>
              <input
                type="text"
                {...register("name")}
                placeholder="e.g., Rent, Netflix"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  {...register("amount")}
                  placeholder="0.00"
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

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Transaction type <span className="text-red-500">*</span>
              </label>
              <select
                {...register("transactionType")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              >
                <option value={TransactionType.REGULAR}>Regular</option>
                <option value={TransactionType.INCOME}>Income</option>
                <option value={TransactionType.RETURN}>Return</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                {...register("frequency")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              >
                {Object.values(PeriodType).map((period) => (
                  <option key={period} value={period}>
                    {FREQUENCY_LABELS[period]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Starts on <span className="text-red-500">*</span>
              </label>
              <DateInput {...register("nextRunAt")} disabled={isPending} />
              {errors.nextRunAt && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.nextRunAt.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ends on (optional)
              </label>
              <DateInput {...register("endAt")} disabled={isPending} />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <span>Reference budget</span>
                <div className="group relative">
                  <Info className="h-4 w-4 text-secondary-600" />
                  <div className="absolute bottom-full left-0 mb-2 hidden w-64 rounded-lg bg-primary-950 p-2 text-xs text-white group-hover:block">
                    Used only to choose a category below — each occurrence posts
                    into whichever active budget covers its date.
                  </div>
                </div>
              </label>
              <select
                value={referenceBudgetId}
                onChange={(e) => setReferenceBudgetId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              >
                <option value="">No reference budget</option>
                {activeBudgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Category (optional)
              </label>
              <select
                {...register("categoryId")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending || !referenceBudgetId}
              >
                <option value="">
                  {referenceBudgetId
                    ? "No category"
                    : "Select a reference budget first"}
                </option>
                {budgetCategories.map((bc) => (
                  <option key={bc.id} value={bc.id}>
                    {bc.name}
                  </option>
                ))}
                {isEditing &&
                  template?.category &&
                  !currentCategoryStillListed && (
                    <option value={template.categoryId ?? ""}>
                      {template.category.name} (current category)
                    </option>
                  )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Payment method (optional)
              </label>
              <select
                {...register("cardId")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              >
                <option value="">Select a payment method</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.cardType}) - {card.user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                {...register("description")}
                rows={2}
                placeholder="Additional details"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={isPending}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              variant="primary"
              isLoading={isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              {isEditing ? "Save changes" : "Create recurring transaction"}
            </Button>
          </div>
        </form>
      </Modal>

      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
      />
    </>
  );
}
