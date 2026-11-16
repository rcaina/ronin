"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import Modal from "../Modal";
import Button from "../Button";
import { useFillBudgetMonth } from "@/lib/data-hooks/budgets/useBudgetCategories";
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
  const lastMonth = formatMonthLabel(shiftMonth(month, -1)).split(" ")[0];
  const monthLabel = formatMonthLabel(month);

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
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleFill()}
            disabled={fillMutation.isPending}
            className="flex-1"
          >
            {fillMutation.isPending ? "Filling..." : "Fill month"}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-gray-500">
        Replaces {monthLabel}&apos;s planned amount on every category with
        history in those months.
      </p>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={source === option.value}
            onClick={() => setSource(option.value)}
            className={`flex min-h-[44px] w-full flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${
              source === option.value
                ? "border-secondary bg-secondary/10"
                : "border-gray-200 bg-surface-card hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-medium text-gray-900">
              {option.label}
            </span>
            <span className="text-xs text-gray-500">{option.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
