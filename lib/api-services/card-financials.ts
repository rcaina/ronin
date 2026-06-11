import { CardType, TransactionType } from "@prisma/client";
import { roundToCents } from "../utils";

type CardTransaction = {
  amount: number;
  transactionType: TransactionType;
};

export const isCreditCardType = (cardType: CardType) =>
  cardType === CardType.CREDIT || cardType === CardType.BUSINESS_CREDIT;

export const isDebitCardType = (cardType: CardType) =>
  cardType === CardType.DEBIT || cardType === CardType.BUSINESS_DEBIT;

/**
 * Computes amountSpent and the effective spendingLimit for a card from its
 * transactions, replacing the per-endpoint copies of this logic.
 *
 * Sign conventions (amounts are stored positive):
 * - REGULAR purchases increase spending / the credit balance
 * - RETURN refunds reduce spending / the credit balance
 * - CARD_PAYMENT reduces a credit card's balance; on the source (debit/cash)
 *   card it counts as money going out
 * - INCOME is never spending; on debit cards it determines the effective
 *   spending limit (money deposited on the card)
 */
export function calculateCardFinancials<
  T extends {
    cardType: CardType;
    spendingLimit: number | null;
    transactions: CardTransaction[];
  },
>(card: T) {
  const isCredit = isCreditCardType(card.cardType);

  const amountSpent = card.transactions.reduce((sum, transaction) => {
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

  let spendingLimit = card.spendingLimit;
  if (isDebitCardType(card.cardType)) {
    const cardIncome = card.transactions.reduce(
      (sum, transaction) =>
        transaction.transactionType === TransactionType.INCOME
          ? sum + transaction.amount
          : sum,
      0,
    );
    spendingLimit = cardIncome > 0 ? roundToCents(cardIncome) : null;
  }

  return {
    ...card,
    amountSpent: roundToCents(amountSpent),
    spendingLimit,
    transactions: undefined, // Remove transactions from response
  };
}
