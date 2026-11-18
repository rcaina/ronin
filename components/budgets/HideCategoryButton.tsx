"use client";

import { useState, type MouseEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useUpdateBudgetCategory } from "@/lib/data-hooks/budgets/useBudgetCategories";
import {
  formatMonthLabel,
  type CategoryVisibilityChange,
  type MonthKey,
  type MonthVisibility,
} from "@/lib/utils/budget-month";

interface HideCategoryButtonProps {
  budgetId: string;
  category: { id: string; name: string; visibility?: MonthVisibility };
  month: MonthKey;
  className?: string;
}

const SUCCESS: Record<CategoryVisibilityChange, string> = {
  "hide-month": "hidden this month",
  "hide-onward": "hidden from this month on",
  show: "unhidden",
};

/** Hide a category in one month or from it on; unhide when it shows only for its transactions. */
export default function HideCategoryButton({
  budgetId,
  category,
  month,
  className = "hover:bg-gray-100",
}: HideCategoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateCategory = useUpdateBudgetCategory();
  const pendingChoice = updateCategory.isPending
    ? updateCategory.variables?.data.visibility
    : undefined;
  const monthLabel = formatMonthLabel(month);

  const change = async (visibility: CategoryVisibilityChange) => {
    try {
      await updateCategory.mutateAsync({
        budgetId,
        categoryId: category.id,
        data: { visibility, month },
      });
      setIsOpen(false);
      toast.success(`${category.name} ${SUCCESS[visibility]}`);
    } catch {
      toast.error(`Couldn't update ${category.name}. Please try again.`);
    }
  };

  const iconButton = `tap-target rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:text-gray-600 disabled:opacity-50 ${className}`;

  // Clicks inside the sheet bubble through the portal; keep them off the row around it.
  const stopClicks = (e: MouseEvent) => e.stopPropagation();

  if (category.visibility === "shown-hidden") {
    return (
      <button
        type="button"
        onClick={(e) => {
          stopClicks(e);
          void change("show");
        }}
        disabled={updateCategory.isPending}
        className={iconButton}
        title={`Unhide ${category.name}`}
        aria-label={`Unhide ${category.name}`}
      >
        <Eye className="h-4 w-4" />
      </button>
    );
  }

  return (
    <span className="contents" onClick={stopClicks}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={iconButton}
        title={`Hide ${category.name}`}
        aria-label={`Hide ${category.name}`}
      >
        <EyeOff className="h-4 w-4" />
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Hide ${category.name}`}
        variant="sheet"
      >
        <p className="mb-4 text-sm text-gray-500">
          A hidden category leaves the month&apos;s list and plans nothing.
          Unhide it any time from the hidden list.
        </p>
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => void change("hide-month")}
            disabled={updateCategory.isPending}
            isLoading={pendingChoice === "hide-month"}
            className="w-full flex-col !items-start py-3 text-left"
          >
            <span className="text-sm font-medium text-gray-900">
              Only {monthLabel}
            </span>
            <span className="text-xs font-normal text-gray-500">
              It comes back next month.
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={() => void change("hide-onward")}
            disabled={updateCategory.isPending}
            isLoading={pendingChoice === "hide-onward"}
            className="w-full flex-col !items-start py-3 text-left"
          >
            <span className="text-sm font-medium text-gray-900">
              {monthLabel} and later
            </span>
            <span className="text-xs font-normal text-gray-500">
              It stays hidden until you unhide it.
            </span>
          </Button>
        </div>
      </Modal>
    </span>
  );
}
