import { CardType, TransactionType } from "@prisma/client";

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
