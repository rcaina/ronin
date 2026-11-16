import { roundToCents } from "@/lib/utils";
import {
  calculateCategorySpentInWindow,
  isWithinWindow,
  type DateWindow,
  type SpendingCategory,
} from "@/lib/utils/spending";

/** Month key as used in URLs and the API: "YYYY-MM", in UTC. */
export type MonthKey = string;

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const toMonthKey = (date: Date): MonthKey =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export const parseMonthKey = (
  value: string | null | undefined,
): MonthKey | null => (value && MONTH_KEY.test(value) ? value : null);

const monthStart = (month: MonthKey): Date => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, monthNumber! - 1, 1));
};

/** Inclusive window from the first to the last millisecond of the month (UTC). */
export const getMonthWindow = (month: MonthKey): DateWindow => {
  const start = monthStart(month);
  const next = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return { start, end: new Date(next.getTime() - 1) };
};

export const shiftMonth = (month: MonthKey, delta: number): MonthKey => {
  const start = monthStart(month);
  return toMonthKey(
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)),
  );
};

export const formatMonthLabel = (month: MonthKey): string =>
  monthStart(month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The category as seen in one month: only transactions and split legs dated inside
 * `window`, and the month's `assigned` amount as planned when it has one.
 */
export const projectCategoryToMonth = <
  C extends SpendingCategory & { allocatedAmount?: number | null },
>(
  category: C,
  window: DateWindow,
  assigned?: number,
): C => ({
  ...category,
  allocatedAmount: assigned ?? category.allocatedAmount,
  transactions: category.transactions?.filter((transaction) =>
    isWithinWindow(transaction, window),
  ),
  transactionSplits: category.transactionSplits?.filter((split) =>
    isWithinWindow(split.transaction, window),
  ),
});

export const QUICK_FILL_SOURCES = [
  "last-month",
  "average-3",
  "last-actual",
] as const;
export type QuickFillSource = (typeof QUICK_FILL_SOURCES)[number];

export interface QuickFillCategory extends SpendingCategory {
  id: string;
  createdAt: Date;
  allocatedAmount: number | null;
  months: Array<{ month: Date; assigned: number }>;
}

const hasHistoryIn = (
  category: QuickFillCategory,
  window: DateWindow,
): boolean =>
  category.createdAt <= window.end ||
  category.months.some(
    (row) => row.month.getTime() === window.start.getTime(),
  ) ||
  !!category.transactions?.some((transaction) =>
    isWithinWindow(transaction, window),
  ) ||
  !!category.transactionSplits?.some((split) =>
    isWithinWindow(split.transaction, window),
  );

/**
 * Planned amount per category id for `month`, from the months before it: last month's
 * plan, the average spent over the last 3 months, or last month's spent. Categories
 * with no history in those months are left out.
 */
export const computeQuickFill = (
  source: QuickFillSource,
  categories: QuickFillCategory[],
  month: MonthKey,
): Map<string, number> => {
  const sourceWindows = Array.from(
    { length: source === "average-3" ? 3 : 1 },
    (_, index) => getMonthWindow(shiftMonth(month, -(index + 1))),
  );
  const fill = new Map<string, number>();

  for (const category of categories) {
    const history = sourceWindows.filter((window) =>
      hasHistoryIn(category, window),
    );
    if (history.length === 0) continue;

    if (source === "last-month") {
      const row = category.months.find(
        (row) => row.month.getTime() === history[0]!.start.getTime(),
      );
      fill.set(category.id, row?.assigned ?? category.allocatedAmount ?? 0);
      continue;
    }

    const spent = history.reduce(
      (sum, window) => sum + calculateCategorySpentInWindow(category, window),
      0,
    );
    fill.set(category.id, roundToCents(Math.max(0, spent / history.length)));
  }

  return fill;
};
