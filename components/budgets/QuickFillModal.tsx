"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import Modal from "../Modal";
import Button from "../Button";
import {
  useFillBudgetMonth,
  useQuickFillPreview,
} from "@/lib/data-hooks/budgets/useBudgetCategories";
import { formatCurrency } from "@/lib/utils";
import {
  formatMonthLabel,
  shiftMonth,
  type MonthKey,
  type QuickFillSource,
} from "@/lib/utils/budget-month";

interface QuickFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  month: MonthKey;
}

export default function QuickFillModal({
  isOpen,
  onClose,
  budgetId,
  month,
}: QuickFillModalProps) {
  const [source, setSource] = useState<QuickFillSource>("last-month");
  const fillMutation = useFillBudgetMonth();
  const preview = useQuickFillPreview(budgetId, month);
  const lastMonth = formatMonthLabel(shiftMonth(month, -1)).split(" ")[0];
  const monthLabel = formatMonthLabel(month);

  const renderTotal = (total: number | null | undefined) => {
    if (preview.isPending) {
      return <span className="h-4 w-16 animate-pulse rounded bg-gray-200" />;
    }
    if (total === undefined) return null;
    return total === null ? (
      <span className="text-xs text-gray-500">Nothing to fill</span>
    ) : (
      <span className="text-sm font-semibold tabular-nums text-gray-900">
        {formatCurrency(total)}
      </span>
    );
  };

  const options: Array<{
    value: QuickFillSource;
    label: string;
    description: string;
  }> = [
    {
      value: "last-month",
      label: "Last month's plan",
      description: `Copy what you planned for ${lastMonth}.`,
    },
    {
      value: "average-3",
      label: "3-month average spending",
      description: "Average of what you spent over the last 3 months.",
    },
    {
      value: "last-actual",
      label: "Last month's spending",
      description: `What you actually spent in ${lastMonth}.`,
    },
  ];

  const handleFill = async () => {
    try {
      const { filled } = await fillMutation.mutateAsync({
        budgetId,
        month,
        source,
      });
      toast.success(
        `Planned ${filled} ${filled === 1 ? "category" : "categories"} for ${monthLabel}`,
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fill the month",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      title={`Fill ${monthLabel}`}
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={fillMutation.isPending}
            className="min-h-11 flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleFill()}
            isLoading={fillMutation.isPending}
            className="min-h-11 flex-1"
          >
            Fill month
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-gray-500">
        Replaces {monthLabel}&apos;s planned amount on every category that
        existed in the months you copy from.
      </p>
      <div className="mb-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-600">Planned now</span>
        {renderTotal(preview.data?.planned)}
      </div>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={source === option.value}
            onClick={() => setSource(option.value)}
            className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${
              source === option.value
                ? "border-secondary bg-secondary/10"
                : "border-gray-200 bg-surface-card hover:border-gray-300"
            }`}
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {option.label}
              </span>
              <span className="text-xs text-gray-500">
                {option.description}
              </span>
            </span>
            {renderTotal(preview.data?.totals[option.value])}
          </button>
        ))}
      </div>
    </Modal>
  );
}
