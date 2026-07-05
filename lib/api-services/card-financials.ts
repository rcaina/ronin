import { CardType, TransactionType } from "@prisma/client";
import { roundToCents } from "../utils";

export type CardTransaction = {
  amount: number;
  transactionType: TransactionType;
};

export const isCreditCardType = (cardType: CardType) =>
  cardType === CardType.CREDIT || cardType === CardType.BUSINESS_CREDIT;

export const isDebitCardType = (cardType: CardType) =>
  cardType === CardType.DEBIT || cardType === CardType.BUSINESS_DEBIT;

/**
 * Computes amountSpent and the effective spendingLimit from a card's own
 * type/limit/transactions. Shared by `calculateCardFinancials` (a single
 * card) and `calculateGeneralCardFinancials` (rolling up a general card's
 * linked budget cards) so the spend math lives in exactly one place.
 *
 * Sign conventions (amounts are stored positive):
 * - REGULAR purchases increase spending / the credit balance
 * - RETURN refunds reduce spending / the credit balance
 * - CARD_PAYMENT reduces a credit card's balance; on the source (debit/cash)
 *   card it counts as money going out
 * - INCOME is never spending; on debit cards it determines the effective
 *   spending limit (money deposited on the card)
 */
function computeCardFinancials(
  cardType: CardType,
  spendingLimit: number | null,
  transactions: CardTransaction[],
): { amountSpent: number; spendingLimit: number | null } {
  const isCredit = isCreditCardType(cardType);

  const amountSpent = transactions.reduce((sum, transaction) => {
    switch (transaction.transactionType) {
      case TransactionType.INCOME:
        return sum;
      case TransactionType.RETURN:
        return sum - transaction.amount;
      case TransactionType.CARD_PAYMENT:
        return isCredit ? sum - transaction.amount : sum + transaction.amount;
      default:
        return sum + transaction.amount;
    }
  }, 0);

  let effectiveSpendingLimit = spendingLimit;
  if (isDebitCardType(cardType)) {
    const cardIncome = transactions.reduce(
      (sum, transaction) =>
        transaction.transactionType === TransactionType.INCOME
          ? sum + transaction.amount
          : sum,
      0,
    );
    effectiveSpendingLimit = cardIncome > 0 ? roundToCents(cardIncome) : null;
  }

  return {
    amountSpent: roundToCents(amountSpent),
    spendingLimit: effectiveSpendingLimit,
  };
}

/**
 * Computes amountSpent and the effective spendingLimit for a card from its
 * transactions, replacing the per-endpoint copies of this logic.
 */
export function calculateCardFinancials<
  T extends {
    cardType: CardType;
    spendingLimit: number | null;
    transactions: CardTransaction[];
  },
>(card: T) {
  const { amountSpent, spendingLimit } = computeCardFinancials(
    card.cardType,
    card.spendingLimit,
    card.transactions,
  );

  return {
    ...card,
    amountSpent,
    spendingLimit,
    transactions: undefined, // Remove transactions from response
  };
}

/**
 * Computes amountSpent (and, for debit templates, the aggregate spendingLimit)
 * for a general/template card by rolling up the financials of every budget
 * card linked to it, reusing the same per-card math as `calculateCardFinancials`
 * rather than re-deriving it here.
 */
export function calculateGeneralCardFinancials<
  T extends {
    cardType: CardType;
    spendingLimit: number | null;
    transactions: CardTransaction[];
    budgetCards: {
      cardType: CardType;
      spendingLimit: number | null;
      transactions: CardTransaction[];
    }[];
  },
>(card: T) {
  // Transactions recorded directly on the template card count too, alongside
  // the rollup of every linked budget card.
  const ownFinancials = computeCardFinancials(
    card.cardType,
    card.spendingLimit,
    card.transactions,
  );
  const budgetCardFinancials = card.budgetCards.map((budgetCard) =>
    computeCardFinancials(
      budgetCard.cardType,
      budgetCard.spendingLimit,
      budgetCard.transactions,
    ),
  );

  const amountSpent = budgetCardFinancials.reduce(
    (sum, budgetCard) => sum + budgetCard.amountSpent,
    ownFinancials.amountSpent,
  );

  let spendingLimit = card.spendingLimit;
  if (isDebitCardType(card.cardType)) {
    const aggregatedLimit = budgetCardFinancials.reduce(
      (sum, budgetCard) => sum + (budgetCard.spendingLimit ?? 0),
      ownFinancials.spendingLimit ?? 0,
    );
    spendingLimit = aggregatedLimit > 0 ? roundToCents(aggregatedLimit) : null;
  }

  return {
    ...card,
    amountSpent: roundToCents(amountSpent),
    spendingLimit,
    transactions: undefined, // Remove transactions from response
    budgetCards: undefined, // Remove nested budget cards from response
  };
}
