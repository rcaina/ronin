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

const MONTH_KEY = /^(20\d{2})-(0[1-9]|1[0-2])$/;

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

export const CATEGORY_VISIBILITY_CHANGES = [
  "hide-month",
  "hide-onward",
  "show",
] as const;
export type CategoryVisibilityChange =
  (typeof CATEGORY_VISIBILITY_CHANGES)[number];

/** A category in a month view: shown, hidden but shown for its transactions, or hidden. */
export type MonthVisibility = "shown" | "shown-hidden" | "hidden";

/** A `CategoryMonth` row: the month's plan, and whether the category is hidden that month. */
export interface MonthPlan {
  month: Date;
  assigned: number;
  hidden?: boolean;
}

export interface MonthPlanned {
  allocatedAmount?: number | null;
  /** First hidden month of an open-ended hide, until unhidden. */
  hiddenFrom?: Date | null;
  months: MonthPlan[];
}

export interface QuickFillCategory extends SpendingCategory, MonthPlanned {
  id: string;
  createdAt: Date;
  allocatedAmount: number | null;
}

const rowFor = (category: MonthPlanned, window: DateWindow) =>
  category.months.find((row) => row.month.getTime() === window.start.getTime());

/** Planned for `month` before hiding: its own plan, else the latest earlier month's, else the category default. */
export const plannedForMonth = (
  category: MonthPlanned,
  month: MonthKey,
): number => {
  const start = monthStart(month).getTime();
  let latest: MonthPlan | undefined;
  for (const row of category.months) {
    const time = row.month.getTime();
    if (time <= start && (!latest || time > latest.month.getTime())) {
      latest = row;
    }
  }
  return latest?.assigned ?? category.allocatedAmount ?? 0;
};

/** Hidden in `month`: on or after `hiddenFrom`, or by that month's own row. */
export const isHiddenInMonth = (
  category: MonthPlanned,
  month: MonthKey,
): boolean => {
  const window = getMonthWindow(month);
  return (
    (!!category.hiddenFrom && category.hiddenFrom <= window.start) ||
    !!rowFor(category, window)?.hidden
  );
};

/**
 * Unhiding `month` of an open-ended hide that began earlier keeps those earlier months
 * hidden: one hidden row each, holding its plan. Empty when the hide starts later.
 */
export const monthsKeptHidden = (
  category: MonthPlanned,
  month: MonthKey,
): Array<{ month: Date; assigned: number }> => {
  if (!category.hiddenFrom) return [];
  const kept = [];
  for (
    let current = toMonthKey(category.hiddenFrom);
    current < month;
    current = shiftMonth(current, 1)
  ) {
    kept.push({
      month: monthStart(current),
      assigned: plannedForMonth(category, current),
    });
  }
  return kept;
};

/** What the month counts as planned: nothing while hidden. */
export const effectivePlanned = (
  category: MonthPlanned,
  month: MonthKey,
): number =>
  isHiddenInMonth(category, month) ? 0 : plannedForMonth(category, month);

const hasActivityIn = (category: SpendingCategory, window: DateWindow) =>
  !!category.transactions?.some((transaction) =>
    isWithinWindow(transaction, window),
  ) ||
  !!category.transactionSplits?.some((split) =>
    isWithinWindow(split.transaction, window),
  );

/** A month view shows a category created by the month's end, or planned or spent in that month. */
export const isCategoryInMonth = (
  category: SpendingCategory & { createdAt: Date },
  window: DateWindow,
  plannedInMonth: boolean,
): boolean =>
  category.createdAt <= window.end ||
  plannedInMonth ||
  hasActivityIn(category, window);

/**
 * How a month view lists a category: `shown`, `shown-hidden` (hidden but it has
 * transactions that month, so they stay visible), `hidden`, or `absent`.
 */
export const monthPresence = (
  category: SpendingCategory & MonthPlanned & { createdAt: Date },
  month: MonthKey,
): "shown" | "shown-hidden" | "hidden" | "absent" => {
  const window = getMonthWindow(month);
  if (!isCategoryInMonth(category, window, !!rowFor(category, window))) {
    return "absent";
  }
  if (!isHiddenInMonth(category, month)) return "shown";
  return hasActivityIn(category, window) ? "shown-hidden" : "hidden";
};

const hasHistoryIn = (
  category: QuickFillCategory,
  window: DateWindow,
): boolean => {
  const presence = monthPresence(category, toMonthKey(window.start));
  return presence === "shown" || presence === "shown-hidden";
};

/**
 * Planned amount per category id for `month`, from the months before it: last month's
 * plan, the average spent over the last 3 months, or last month's spent. Categories
 * hidden in `month` or with no history in those months are left out.
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
    if (isHiddenInMonth(category, month)) continue;
    const history = sourceWindows.filter((window) =>
      hasHistoryIn(category, window),
    );
    if (history.length === 0) continue;

    if (source === "last-month") {
      fill.set(
        category.id,
        effectivePlanned(category, toMonthKey(history[0]!.start)),
      );
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
  const total = categories.reduce((sum, category) => {
    const filled = fill.get(category.id);
    if (filled !== undefined) return sum + filled;
    if (monthPresence(category, month) === "absent") return sum;
    return sum + effectivePlanned(category, month);
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
    carry +=
      effectivePlanned(category, current) -
      calculateCategorySpentInWindow(category, getMonthWindow(current));
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

/**
 * Month rows for categories merged into one: every month any copy planned, started
 * hiding or ended a one-month hide gets the sum of the visible copies' plans, hidden
 * when every copy is (then keeping their plans, so unhiding restores them).
 */
export const mergeMonthPlans = (
  copies: Array<MonthPlanned & { allocatedAmount: number | null }>,
): Required<MonthPlan>[] => {
  const months = new Set(
    copies.flatMap((copy) => [
      ...copy.months.map((row) => row.month.getTime()),
      // A one-month hide ends the month after, which changes that month's sum too.
      ...copy.months
        .filter((row) => row.hidden)
        .map((row) =>
          monthStart(shiftMonth(toMonthKey(row.month), 1)).getTime(),
        ),
      ...(copy.hiddenFrom ? [copy.hiddenFrom.getTime()] : []),
    ]),
  );
  return [...months].map((time) => {
    const month = toMonthKey(new Date(time));
    const hidden = copies.every((copy) => isHiddenInMonth(copy, month));
    return {
      month: new Date(time),
      assigned: roundToCents(
        copies.reduce(
          (sum, copy) =>
            sum +
            (hidden
              ? plannedForMonth(copy, month)
              : effectivePlanned(copy, month)),
          0,
        ),
      ),
      hidden,
    };
  });
};

/** A merged category's open-ended hide: only when every copy has one, from the latest. */
export const mergeHiddenFrom = (copies: MonthPlanned[]): Date | null =>
  copies.every((copy) => copy.hiddenFrom)
    ? new Date(Math.max(...copies.map((copy) => copy.hiddenFrom!.getTime())))
    : null;
