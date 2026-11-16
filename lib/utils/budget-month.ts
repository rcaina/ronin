import {
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

/** The category with only the transactions and split legs dated inside `window`. */
export const projectCategoryToMonth = <C extends SpendingCategory>(
  category: C,
  window: DateWindow,
): C => ({
  ...category,
  transactions: category.transactions?.filter((transaction) =>
    isWithinWindow(transaction, window),
  ),
  transactionSplits: category.transactionSplits?.filter((split) =>
    isWithinWindow(split.transaction, window),
  ),
});
