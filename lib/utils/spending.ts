import { CardType, TransactionType } from "@prisma/client";
import { roundToCents } from "@/lib/utils";

/**
 * Minimal transaction shape needed for spending/income calculations.
 * Compatible structurally with Prisma `Transaction` and the serialized
 * shapes returned by the API.
 */
export interface SpendingTransaction {
  transactionType: TransactionType;
  amount: number;
  cardId?: string | null;
  createdAt?: string | Date;
  occurredAt?: string | Date | null;
}

/**
 * An inclusive date range. Pass `null` anywhere a window is accepted to mean
 * "no bound" (count everything).
 */
export interface DateWindow {
  start: Date;
  end: Date;
}

export interface SpendingCategory {
  transactions?: SpendingTransaction[] | null;
}

export interface IncomeBudget {
  cards?: Array<{ id: string; cardType: CardType }> | null;
  transactions?: SpendingTransaction[] | null;
}

export interface SpendingBudget {
  categories?: SpendingCategory[] | null;
}

/**
 * Net spending contribution of a single transaction:
 * - INCOME and CARD_PAYMENT are not spending (0)
 * - RETURN reduces spending (refund received, so negative)
 * - everything else is a purchase (positive)
 */
export const getTransactionSpending = (
  transaction: SpendingTransaction,
): number => {
  if (
    transaction.transactionType === TransactionType.INCOME ||
    transaction.transactionType === TransactionType.CARD_PAYMENT
  ) {
    return 0;
  }
  if (transaction.transactionType === TransactionType.RETURN) {
    return -transaction.amount;
  }
  return transaction.amount;
};

/** Sum spending across a list of transactions. */
export const sumTransactionSpending = (
  transactions?: SpendingTransaction[] | null,
): number =>
  (transactions ?? []).reduce(
    (sum, transaction) => sum + getTransactionSpending(transaction),
    0,
  );

/**
 * Effective date of a transaction for time-window filtering: the date it
 * occurred if recorded, otherwise the date it was created.
 */
export const getTransactionDate = (transaction: SpendingTransaction): Date =>
  new Date(transaction.occurredAt ?? transaction.createdAt ?? 0);

/**
 * Whether a transaction falls within a date window. A `null` window means
 * "no bound" — every transaction is included.
 */
export const isWithinWindow = (
  transaction: SpendingTransaction,
  window: DateWindow | null,
): boolean => {
  if (!window) return true;
  const date = getTransactionDate(transaction);
  return date >= window.start && date <= window.end;
};

/** Total spending within a single category, limited to a date window. */
export const calculateCategorySpentInWindow = (
  category: SpendingCategory,
  window: DateWindow | null,
): number =>
  (category.transactions ?? []).reduce(
    (sum, transaction) =>
      isWithinWindow(transaction, window)
        ? sum + getTransactionSpending(transaction)
        : sum,
    0,
  );

/** Total spending across all categories of a budget, limited to a window. */
export const calculateBudgetSpentInWindow = (
  budget: SpendingBudget,
  window: DateWindow | null,
): number =>
  (budget.categories ?? []).reduce(
    (sum, category) => sum + calculateCategorySpentInWindow(category, window),
    0,
  );

/**
 * Total income for a budget within a date window: the sum of INCOME
 * transactions on a debit (or business debit) card whose date falls in range.
 */
export const calculateTotalIncomeInWindow = (
  budget: IncomeBudget,
  window: DateWindow | null,
): number => {
  const debitCardIds = new Set(
    (budget.cards ?? [])
      .filter(
        (card) =>
          card.cardType === CardType.DEBIT ||
          card.cardType === CardType.BUSINESS_DEBIT,
      )
      .map((card) => card.id),
  );

  return (budget.transactions ?? []).reduce((sum, transaction) => {
    if (
      transaction.transactionType === TransactionType.INCOME &&
      transaction.cardId &&
      debitCardIds.has(transaction.cardId) &&
      isWithinWindow(transaction, window)
    ) {
      return sum + transaction.amount;
    }
    return sum;
  }, 0);
};

/** Total spending within a single category (all time). */
export const calculateCategorySpent = (category: SpendingCategory): number =>
  calculateCategorySpentInWindow(category, null);

/** Total spending across all categories of a budget (all time). */
export const calculateBudgetSpent = (budget: SpendingBudget): number =>
  calculateBudgetSpentInWindow(budget, null);

/**
 * Total income for a budget (all time): the sum of INCOME transactions that
 * sit on a debit (or business debit) card.
 */
export const calculateTotalIncome = (budget: IncomeBudget): number =>
  calculateTotalIncomeInWindow(budget, null);

/** Spending percentage (spent / income * 100), guarding divide-by-zero. */
export const calculateSpendingPercentage = (
  spent: number,
  income: number,
): number => (income > 0 ? (spent / income) * 100 : 0);

/** Flatten every category transaction across one or more budgets. */
export const flattenBudgetTransactions = (
  budgets: SpendingBudget[],
): SpendingTransaction[] =>
  budgets.flatMap((budget) =>
    (budget.categories ?? []).flatMap(
      (category) => category.transactions ?? [],
    ),
  );

/**
 * Total spending across transactions that occurred within the last `days`
 * days (measured from now, not bucketed to midnight).
 */
export const calculateRecentSpending = (
  transactions: SpendingTransaction[],
  days = 7,
): number => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return transactions.reduce((sum, transaction) => {
    const date = new Date(transaction.createdAt ?? 0);
    return date >= since ? sum + getTransactionSpending(transaction) : sum;
  }, 0);
};

export interface DailySpendingPoint {
  /** Short weekday label for the x-axis, e.g. "Mon". */
  day: string;
  /** Full weekday label used in the tooltip, e.g. "Monday". */
  date: string;
  /** Average spending for that weekday across the transaction date range. */
  spending: number;
}

// Weekday order (Monday-first) paired with the `Date.getDay()` index it maps to.
const WEEKDAYS: Array<{ short: string; full: string; dayIndex: number }> = [
  { short: "Mon", full: "Monday", dayIndex: 1 },
  { short: "Tue", full: "Tuesday", dayIndex: 2 },
  { short: "Wed", full: "Wednesday", dayIndex: 3 },
  { short: "Thu", full: "Thursday", dayIndex: 4 },
  { short: "Fri", full: "Friday", dayIndex: 5 },
  { short: "Sat", full: "Saturday", dayIndex: 6 },
  { short: "Sun", full: "Sunday", dayIndex: 0 },
];

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Average spending per weekday (Monday-first), shaped for the daily-spending
 * trend charts. For each weekday the total spending is divided by the number of
 * calendar occurrences of that weekday within the transactions' date range, so
 * weekdays with no spending still pull the average down.
 */
export const calculateAverageSpendingByWeekday = (
  transactions: SpendingTransaction[],
): DailySpendingPoint[] => {
  const totals = new Array(7).fill(0) as number[];
  const occurrences = new Array(7).fill(0) as number[];

  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const transaction of transactions) {
    const transactionDate = startOfDay(new Date(transaction.createdAt ?? 0));
    const dayIndex = transactionDate.getDay();
    totals[dayIndex] = (totals[dayIndex] ?? 0) + getTransactionSpending(transaction);

    if (!minDate || transactionDate < minDate) minDate = transactionDate;
    if (!maxDate || transactionDate > maxDate) maxDate = transactionDate;
  }

  // Count how many times each weekday occurs across the data's date range so we
  // average over every such day, not just the days that had transactions.
  if (minDate && maxDate) {
    for (
      const cursor = new Date(minDate);
      cursor <= maxDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dayIndex = cursor.getDay();
      occurrences[dayIndex] = (occurrences[dayIndex] ?? 0) + 1;
    }
  }

  return WEEKDAYS.map(({ short, full, dayIndex }) => {
    const count = occurrences[dayIndex] ?? 0;
    const average = count > 0 ? (totals[dayIndex] ?? 0) / count : 0;
    return {
      day: short,
      date: full,
      spending: roundToCents(average),
    };
  });
};
