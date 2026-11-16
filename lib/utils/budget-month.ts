import { BudgetKind, TransactionType } from "@prisma/client";
import { HttpError } from "@/lib/errors";
import { roundToCents } from "@/lib/utils";
import {
  calculateCategorySpentInWindow,
  getTransactionDate,
  isWithinWindow,
  type DateWindow,
  type SpendingCategory,
  type SpendingTransaction,
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

/** Days left in a window that ends inclusively, counting today. */
export const daysLeftInWindow = (window: DateWindow, now: Date): number =>
  Math.max(0, Math.ceil((window.end.getTime() - now.getTime()) / 86_400_000));

/** Date input default for adding into `month`: blank in the current month (the server uses now), else its day nearest today. */
export const defaultDateInMonth = (
  month: MonthKey,
  now: Date,
): string | undefined => {
  const { start, end } = getMonthWindow(month);
  if (now >= start && now <= end) return undefined;
  return (now < start ? start : end).toISOString().slice(0, 10);
};

export const shiftMonth = (month: MonthKey, delta: number): MonthKey => {
  const start = monthStart(month);
  return toMonthKey(
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)),
  );
};

/** Month window for a `?month=` read: null when absent or the budget isn't continuous. */
export const resolveMonthWindow = (
  kind: BudgetKind,
  monthParam: string | null | undefined,
): DateWindow | null => {
  if (!monthParam) return null;
  const month = parseMonthKey(monthParam);
  if (!month) throw new HttpError("Invalid month, expected YYYY-MM", 400);
  return kind === BudgetKind.CONTINUOUS ? getMonthWindow(month) : null;
};

/** A card's transactions counted in a month window; card payments are money movement, not that month's spending. */
export const cardTransactionsInWindow = <T extends SpendingTransaction>(
  transactions: T[],
  window: DateWindow | null,
): T[] =>
  window
    ? transactions.filter(
        (transaction) =>
          transaction.transactionType !== TransactionType.CARD_PAYMENT &&
          isWithinWindow(transaction, window),
      )
    : transactions;

/** New transactions, scans and imports default to the continuous budget when the account has one. */
export const findContinuousBudgetId = (
  budgets: readonly { id: string; kind: BudgetKind }[],
): string | undefined =>
  budgets.find((budget) => budget.kind === BudgetKind.CONTINUOUS)?.id;

/** Month of a date input value ("YYYY-MM-DD"), or of `fallback` while it is empty or partial. */
export const monthOfDateInput = (
  value: string | undefined,
  fallback: Date,
): MonthKey => parseMonthKey(value?.slice(0, 7)) ?? toMonthKey(fallback);

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

/** A month view shows a category created by the month's end, or planned or spent in that month. */
export const isCategoryInMonth = (
  category: SpendingCategory & { createdAt: Date },
  window: DateWindow,
  plannedInMonth: boolean,
): boolean =>
  category.createdAt <= window.end ||
  plannedInMonth ||
  !!category.transactions?.some((transaction) =>
    isWithinWindow(transaction, window),
  ) ||
  !!category.transactionSplits?.some((split) =>
    isWithinWindow(split.transaction, window),
  );

const hasHistoryIn = (
  category: QuickFillCategory,
  window: DateWindow,
): boolean =>
  isCategoryInMonth(
    category,
    window,
    category.months.some(
      (row) => row.month.getTime() === window.start.getTime(),
    ),
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

/** Why a fill from `computeQuickFill` would be refused, or null when it can be applied. */
export const quickFillRefusal = (fill: Map<string, number>): string | null => {
  if (fill.size === 0) return "No earlier months to fill from";
  if ([...fill.values()].every((assigned) => assigned === 0)) {
    return "Nothing to fill: every category came out at $0";
  }
  return null;
};

/** The month's planned total over the categories it shows, with `fill` replacing each filled plan. */
export const plannedTotalForMonth = (
  categories: QuickFillCategory[],
  month: MonthKey,
  fill: Map<string, number> = new Map(),
): number => {
  const window = getMonthWindow(month);
  const total = categories.reduce((sum, category) => {
    const filled = fill.get(category.id);
    if (filled !== undefined) return sum + filled;
    const row = category.months.find(
      (row) => row.month.getTime() === window.start.getTime(),
    );
    if (!isCategoryInMonth(category, window, !!row)) return sum;
    return sum + (row?.assigned ?? category.allocatedAmount ?? 0);
  }, 0);
  return roundToCents(total);
};

export interface QuickFillPreview {
  planned: number;
  totals: Record<QuickFillSource, number | null>;
}

/**
 * Balance carried into `month` by a rollover category: planned minus spent for every
 * month from its first month up to the one before `month`. Zero when rollover is off.
 */
export const computeCarry = (
  category: QuickFillCategory & { rollover: boolean },
  month: MonthKey,
): number => {
  if (!category.rollover) return 0;

  const firstDate = new Date(
    Math.min(
      category.createdAt.getTime(),
      ...category.months.map((row) => row.month.getTime()),
      ...(category.transactions ?? []).map((transaction) =>
        getTransactionDate(transaction).getTime(),
      ),
      ...(category.transactionSplits ?? []).map((split) =>
        getTransactionDate(split.transaction).getTime(),
      ),
    ),
  );

  let carry = 0;
  for (
    let current = toMonthKey(firstDate);
    current < month;
    current = shiftMonth(current, 1)
  ) {
    const window = getMonthWindow(current);
    const row = category.months.find(
      (row) => row.month.getTime() === window.start.getTime(),
    );
    carry +=
      (row?.assigned ?? category.allocatedAmount ?? 0) -
      calculateCategorySpentInWindow(category, window);
  }
  return roundToCents(carry);
};

/** Month income not yet planned into a category; negative when over-planned. */
export const calculateReadyToAssign = (
  income: number,
  categories: Array<{ allocatedAmount?: number | null }>,
): number =>
  roundToCents(
    income -
      categories.reduce(
        (sum, category) => sum + (category.allocatedAmount ?? 0),
        0,
      ),
  );

interface MonthPlan {
  month: Date;
  assigned: number;
}

/**
 * Month rows for categories merged into one: every month any copy planned gets the sum
 * of each copy's plan for it, falling back to that copy's default.
 */
export const mergeMonthPlans = (
  copies: Array<{ allocatedAmount: number | null; months: MonthPlan[] }>,
): MonthPlan[] => {
  const months = new Set(
    copies.flatMap((copy) => copy.months.map((row) => row.month.getTime())),
  );
  return [...months].map((time) => ({
    month: new Date(time),
    assigned: roundToCents(
      copies.reduce(
        (sum, copy) =>
          sum +
          (copy.months.find((row) => row.month.getTime() === time)?.assigned ??
            copy.allocatedAmount ??
            0),
        0,
      ),
    ),
  }));
};
