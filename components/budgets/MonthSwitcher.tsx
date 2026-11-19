"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/Button";
import {
  formatMonthLabel,
  shiftMonth,
  toMonthKey,
  type MonthKey,
} from "@/lib/utils/budget-month";

interface MonthSwitcherProps {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
  /** Earliest month to step back to: the budget's start month. */
  minMonth: MonthKey;
}

export default function MonthSwitcher({
  month,
  onChange,
  minMonth,
}: MonthSwitcherProps) {
  const currentMonth = toMonthKey(new Date());

  return (
    <div className="flex items-center gap-2">
      {month !== currentMonth && (
        <Button
          variant="outline"
          onClick={() => onChange(currentMonth)}
          className="min-h-11 shrink-0"
        >
          This month
        </Button>
      )}
      <div className="card-surface flex min-w-0 flex-1 items-center justify-between gap-1 p-1 sm:flex-none">
        <button
          type="button"
          onClick={() => onChange(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-center text-sm font-semibold tabular-nums text-gray-900 sm:min-w-36 sm:flex-none"
        >
          {formatMonthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => onChange(shiftMonth(month, 1))}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-900"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
