import { CardType, TransactionType } from "@prisma/client";
import type { TransactionWithRelations } from "@/lib/types/transaction";

export interface TransactionAmountDisplay {
  /** "+" for money coming into the card, "-" for money going out */
  prefix: "+" | "-";
  /** Tailwind text color class matching the prefix */
  colorClass: string;
}

/**
 * Sign and color for a transaction amount shown from a specific card's
 * perspective. Amounts are stored positive; direction comes from the
 * transaction type and the card it sits on:
 * - INCOME and RETURN bring money in (green, "+")
 * - CARD_PAYMENT reduces a credit card's debt (green, "+") but is money
 *   leaving the source debit/cash card (red, "-")
 * - REGULAR purchases are money out (red, "-")
 */
export const getCardTransactionDisplay = (
  transactionType: TransactionType,
  cardType: CardType,
): TransactionAmountDisplay => {
  const isCredit =
    cardType === CardType.CREDIT || cardType === CardType.BUSINESS_CREDIT;

  const isMoneyIn =
    transactionType === TransactionType.INCOME ||
    transactionType === TransactionType.RETURN ||
    (transactionType === TransactionType.CARD_PAYMENT && isCredit);

  return isMoneyIn
    ? { prefix: "+", colorClass: "text-green-600" }
    : { prefix: "-", colorClass: "text-red-600" };
};

/**
 * Badge classes for the "Split" indicator shown where a category badge would
 * otherwise go for a split transaction (categoryId is null, amount is spread
 * across `splits`). Uses the accent tint (same idiom as the "Income" chip on
 * the per-budget transactions page) since it isn't a real category.
 */
export const SPLIT_BADGE_CLASSES = "bg-accent text-primary";

/** Label for the split badge, e.g. "Split · 3 categories". */
export const getSplitBadgeLabel = (splitCount: number): string =>
  `Split · ${splitCount} categor${splitCount === 1 ? "y" : "ies"}`;

/**
 * Badge classes for the small "Recurring" indicator shown next to a
 * transaction that was auto-posted by the recurring-transactions engine
 * (`transaction.recurringTransactionId` set — see
 * lib/api-services/recurring.ts). Secondary tint since it's metadata about
 * the transaction's origin, not a category or status.
 */
export const RECURRING_BADGE_CLASSES = "bg-secondary-50 text-secondary-700";

export interface TransactionFilters {
  /** Free-text search across name, description, category and amount. */
  searchTerm: string;
  /** Default category id, or "all". */
  selectedCategory: string;
  /** Budget id, "all", or "no-budget". */
  selectedBudget: string;
  /** Card id, "all", or "no-card". */
  selectedCard: string;
  /** ISO date string (inclusive lower bound) or "". */
  startDate: string;
  /** ISO date string (inclusive upper bound) or "". */
  endDate: string;
}

/**
 * Whether a transaction passes the active transaction-list filters. Shared by
 * the page's stats and the visible-rows computations so they stay in sync.
 */
export const matchesTransactionFilters = (
  transaction: TransactionWithRelations,
  filters: TransactionFilters,
): boolean => {
  const {
    searchTerm,
    selectedCategory,
    selectedBudget,
    selectedCard,
    startDate,
    endDate,
  } = filters;

  const searchLower = searchTerm.toLowerCase();
  const matchesSearch =
    (transaction.name?.toLowerCase().includes(searchLower) ?? false) ||
    (transaction.description?.toLowerCase().includes(searchLower) ?? false) ||
    (transaction.category?.name?.toLowerCase().includes(searchLower) ??
      false) ||
    // Amount search - convert amount to string and search
    Math.abs(transaction.amount)
      .toString()
      .includes(searchTerm.replace(/[^0-9.]/g, "")) ||
    // Also search formatted amount (e.g., "100.50" matches "100.5")
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    })
      .format(transaction.amount)
      .toLowerCase()
      .includes(searchLower);

  // Category filter - match by default category ID, on either the
  // transaction's own category or (for split transactions) any of its splits'
  // categories.
  const matchesCategory =
    selectedCategory === "all" ||
    (!!transaction.category &&
      "defaultCategoryId" in transaction.category &&
      transaction.category.defaultCategoryId === selectedCategory) ||
    (transaction.splits?.some(
      (split) => split.category.defaultCategoryId === selectedCategory,
    ) ??
      false);

  // Budget filter
  const matchesBudget =
    selectedBudget === "all" ||
    transaction.Budget?.id === selectedBudget ||
    (selectedBudget === "no-budget" && !transaction.Budget);

  // Card filter
  const matchesCard =
    selectedCard === "all" ||
    (selectedCard === "no-card" && !transaction.cardId) ||
    transaction.cardId === selectedCard;

  // Date range filter
  const matchesDateRange = (() => {
    if (!startDate && !endDate) return true;

    const transactionDate = transaction.occurredAt
      ? new Date(transaction.occurredAt)
      : new Date(transaction.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end) {
      return transactionDate >= start && transactionDate <= end;
    } else if (start) {
      return transactionDate >= start;
    } else if (end) {
      return transactionDate <= end;
    }
    return true;
  })();

  return (
    matchesSearch &&
    !!matchesCategory &&
    matchesBudget &&
    matchesCard &&
    matchesDateRange
  );
};
