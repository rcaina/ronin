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

/** Total spending within a single category. */
export const calculateCategorySpent = (category: SpendingCategory): number =>
  sumTransactionSpending(category.transactions);

/** Total spending across all categories of a budget. */
export const calculateBudgetSpent = (budget: SpendingBudget): number =>
  (budget.categories ?? []).reduce(
    (sum, category) => sum + calculateCategorySpent(category),
    0,
  );

/**
 * Total income for a budget: the sum of INCOME transactions that sit on a
 * debit (or business debit) card.
 */
export const calculateTotalIncome = (budget: IncomeBudget): number => {
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
      debitCardIds.has(transaction.cardId)
    ) {
      return sum + transaction.amount;
    }
    return sum;
  }, 0);
};

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
  day: string;
  date: string;
  spending: number;
}

/**
 * Per-day spending totals for the last `days` days (oldest first), shaped for
 * the daily-spending trend charts.
 */
export const calculateDailySpending = (
  transactions: SpendingTransaction[],
  days = 7,
): DailySpendingPoint[] => {
  const result: DailySpendingPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const spending = transactions.reduce((sum, transaction) => {
      const transactionDate = new Date(transaction.createdAt ?? 0);
      if (transactionDate >= date && transactionDate < nextDate) {
        return sum + getTransactionSpending(transaction);
      }
      return sum;
    }, 0);

    result.push({
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      spending: roundToCents(spending),
    });
  }

  return result;
};
