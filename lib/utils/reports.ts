import { type CategoryType } from "@prisma/client";
import { roundToCents } from "@/lib/utils";
import {
  calculateBudgetSpentInWindow,
  calculateCategorySpentInWindow,
  calculateTotalIncomeInWindow,
  type DateWindow,
  type IncomeBudget,
  type SpendingCategory,
} from "@/lib/utils/spending";

/**
 * Aggregation helpers for the `/reports` page. These are built ENTIRELY on
 * top of the spend/income semantics in `lib/utils/spending.ts` (RETURN
 * reduces spending; INCOME/CARD_PAYMENT are money movement, excluded from
 * category spending) — nothing here re-derives that math, it only buckets
 * and sums what `spending.ts` already computes correctly.
 */

/** A single category, extended with the identity/group fields reports need
 * beyond the bare spending shape in `lib/utils/spending.ts`. */
export interface ReportCategory extends SpendingCategory {
  id: string;
  name: string;
  group: CategoryType;
}

/** A budget shaped for report aggregation: category spending (via
 * `ReportCategory`) plus the income-bearing fields from `IncomeBudget`. The
 * budget's own period (`startAt`/`endAt`) drives `deriveWindowFromBudgets`. */
export interface ReportBudget extends IncomeBudget {
  id: string;
  startAt: Date;
  endAt: Date;
  categories?: ReportCategory[] | null;
}

export type ReportGranularity = "day" | "week" | "month";

export interface ReportBucket extends DateWindow {
  /** Short axis/tooltip label, e.g. "Jun 1", "Week of Jun 1", "Jun". */
  label: string;
}

// ---------------------------------------------------------------------------
// Date bucketing
// ---------------------------------------------------------------------------

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Monday-first week start.
const startOfWeek = (date: Date): Date => {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(result, diff);
};

const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

// Hard cap on generated buckets so a mis-paired window/granularity (e.g. "day"
// granularity over a multi-year window) can't spin the loop forever.
const MAX_BUCKETS = 400;

/**
 * Picks a sensible bucket size for a window's span: short windows get daily
 * resolution, medium windows weekly, long windows monthly — keeps chart data
 * legible instead of either too sparse or too dense at 375px.
 */
export const pickGranularity = (window: DateWindow): ReportGranularity => {
  const days = Math.max(
    1,
    Math.ceil(
      (window.end.getTime() - window.start.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  if (days <= 45) return "day";
  if (days <= 210) return "week";
  return "month";
};

/** Splits a window into contiguous buckets of the given granularity. */
export const generateReportBuckets = (
  window: DateWindow,
  granularity: ReportGranularity,
): ReportBucket[] => {
  const buckets: ReportBucket[] = [];
  const windowEnd = endOfDay(window.end);

  if (granularity === "day") {
    let cursor = startOfDay(window.start);
    while (cursor <= windowEnd && buckets.length < MAX_BUCKETS) {
      buckets.push({
        start: cursor,
        end: endOfDay(cursor),
        label: DAY_LABEL.format(cursor),
      });
      cursor = addDays(cursor, 1);
    }
  } else if (granularity === "week") {
    let cursor = startOfWeek(window.start);
    while (cursor <= windowEnd && buckets.length < MAX_BUCKETS) {
      buckets.push({
        start: cursor,
        end: endOfDay(addDays(cursor, 6)),
        label: `Week of ${DAY_LABEL.format(cursor)}`,
      });
      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = startOfMonth(window.start);
    while (cursor <= windowEnd && buckets.length < MAX_BUCKETS) {
      buckets.push({
        start: cursor,
        end: endOfDay(addDays(addMonths(cursor, 1), -1)),
        label: MONTH_LABEL.format(cursor),
      });
      cursor = addMonths(cursor, 1);
    }
  }

  return buckets;
};

/**
 * The smallest window spanning every budget's `startAt`/`endAt`. Falls back
 * to the last `fallbackDays` days when there are no budgets (e.g. a free
 * account with no active budget yet), so charts always have a window to
 * render an empty state against.
 */
export const deriveWindowFromBudgets = (
  budgets: ReadonlyArray<{ startAt: Date; endAt: Date }>,
  fallbackDays = 30,
): DateWindow => {
  if (budgets.length === 0) {
    const end = new Date();
    return { start: addDays(end, -fallbackDays), end };
  }

  const start = budgets.reduce(
    (min, budget) => (budget.startAt < min ? budget.startAt : min),
    budgets[0]!.startAt,
  );
  const end = budgets.reduce(
    (max, budget) => (budget.endAt > max ? budget.endAt : max),
    budgets[0]!.endAt,
  );
  return { start, end };
};

/**
 * The window of the same duration immediately preceding `window` — used for
 * "this period vs last" comparisons.
 */
export const previousWindow = (window: DateWindow): DateWindow => {
  const durationMs = window.end.getTime() - window.start.getTime();
  const end = new Date(window.start.getTime() - 1);
  const start = new Date(end.getTime() - durationMs);
  return { start, end };
};

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

export interface SpendingOverTimePoint {
  /** ISO bucket-start date — stable sort/merge key. */
  date: string;
  label: string;
  spending: number;
}

/** Total spending per bucket across one or more budgets. */
export const calculateSpendingOverTime = (
  budgets: ReportBudget[],
  window: DateWindow,
  granularity: ReportGranularity = pickGranularity(window),
): SpendingOverTimePoint[] =>
  generateReportBuckets(window, granularity).map((bucket) => ({
    date: bucket.start.toISOString(),
    label: bucket.label,
    spending: roundToCents(
      budgets.reduce(
        (sum, budget) => sum + calculateBudgetSpentInWindow(budget, bucket),
        0,
      ),
    ),
  }));

export interface CategoryBreakdownPoint {
  categoryId: string;
  name: string;
  group: CategoryType;
  amount: number;
}

/**
 * Total spend per category within a window, across one or more budgets,
 * sorted highest-spend first. Categories with zero or negative (net-refunded)
 * spend in the window are omitted, matching the existing dashboard's "top
 * categories" convention.
 */
export const calculateCategoryBreakdown = (
  budgets: ReportBudget[],
  window: DateWindow | null,
): CategoryBreakdownPoint[] => {
  const totals = new Map<string, CategoryBreakdownPoint>();

  for (const budget of budgets) {
    for (const category of budget.categories ?? []) {
      const amount = calculateCategorySpentInWindow(category, window);
      if (amount <= 0) continue;

      const existing = totals.get(category.id);
      if (existing) {
        existing.amount = roundToCents(existing.amount + amount);
      } else {
        totals.set(category.id, {
          categoryId: category.id,
          name: category.name,
          group: category.group,
          amount: roundToCents(amount),
        });
      }
    }
  }

  return [...totals.values()].sort((a, b) => b.amount - a.amount);
};

export interface GroupSplitPoint {
  date: string;
  label: string;
  NEEDS: number;
  WANTS: number;
  INVESTMENT: number;
}

/** Spending per bucket, split by category group (Needs/Wants/Investment). */
export const calculateGroupSplitOverTime = (
  budgets: ReportBudget[],
  window: DateWindow,
  granularity: ReportGranularity = pickGranularity(window),
): GroupSplitPoint[] =>
  generateReportBuckets(window, granularity).map((bucket) => {
    const totals: Record<CategoryType, number> = {
      NEEDS: 0,
      WANTS: 0,
      INVESTMENT: 0,
    };

    for (const budget of budgets) {
      for (const category of budget.categories ?? []) {
        totals[category.group] += calculateCategorySpentInWindow(
          category,
          bucket,
        );
      }
    }

    return {
      date: bucket.start.toISOString(),
      label: bucket.label,
      NEEDS: roundToCents(totals.NEEDS),
      WANTS: roundToCents(totals.WANTS),
      INVESTMENT: roundToCents(totals.INVESTMENT),
    };
  });

export interface IncomeVsSpendingPoint {
  date: string;
  label: string;
  income: number;
  spending: number;
}

/** Income vs. spending per bucket across one or more budgets. */
export const calculateIncomeVsSpendingOverTime = (
  budgets: ReportBudget[],
  window: DateWindow,
  granularity: ReportGranularity = pickGranularity(window),
): IncomeVsSpendingPoint[] =>
  generateReportBuckets(window, granularity).map((bucket) => ({
    date: bucket.start.toISOString(),
    label: bucket.label,
    income: roundToCents(
      budgets.reduce(
        (sum, budget) => sum + calculateTotalIncomeInWindow(budget, bucket),
        0,
      ),
    ),
    spending: roundToCents(
      budgets.reduce(
        (sum, budget) => sum + calculateBudgetSpentInWindow(budget, bucket),
        0,
      ),
    ),
  }));

export interface ReportSummary {
  income: number;
  spending: number;
  net: number;
  /** (net / income) * 100, 0 when income is 0. */
  savingsRate: number;
}

/** Headline income/spending/net totals for a window, across one or more budgets. */
export const calculateReportSummary = (
  budgets: ReportBudget[],
  window: DateWindow | null,
): ReportSummary => {
  const income = roundToCents(
    budgets.reduce(
      (sum, budget) => sum + calculateTotalIncomeInWindow(budget, window),
      0,
    ),
  );
  const spending = roundToCents(
    budgets.reduce(
      (sum, budget) => sum + calculateBudgetSpentInWindow(budget, window),
      0,
    ),
  );
  const net = roundToCents(income - spending);
  const savingsRate = income > 0 ? roundToCents((net / income) * 100) : 0;

  return { income, spending, net, savingsRate };
};

export interface ReportComparison {
  current: ReportSummary;
  previous: ReportSummary;
  /** Percent change current vs. previous; null when previous is 0 (undefined %). */
  spendingChangePct: number | null;
  incomeChangePct: number | null;
}

const percentChange = (current: number, previous: number): number | null =>
  previous === 0 ? null : roundToCents(((current - previous) / previous) * 100);

/** Premium "this period vs last" comparison: summaries for two windows plus deltas. */
export const calculateReportComparison = (
  budgets: ReportBudget[],
  currentWindow: DateWindow,
  previousWindowRange: DateWindow,
): ReportComparison => {
  const current = calculateReportSummary(budgets, currentWindow);
  const previous = calculateReportSummary(budgets, previousWindowRange);

  return {
    current,
    previous,
    spendingChangePct: percentChange(current.spending, previous.spending),
    incomeChangePct: percentChange(current.income, previous.income),
  };
};
