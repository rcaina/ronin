import { CardType } from "@prisma/client";
import type { Card as ApiCard } from "../types/card";

// Component interface for cards
export interface Card {
  id: string;
  name: string;
  lastFourDigits?: string;
  type: "credit" | "debit" | "business_credit" | "business_debit" | "cash";
  amountSpent: number;
  spendingLimit?: number;
  userId: string;
  user: string;
  isActive: boolean;
  color: string;
}

// Human-readable labels for each card type, shared by card forms and modals.
export const CARD_TYPE_LABELS: Record<CardType, string> = {
  [CardType.CASH]: "Cash",
  [CardType.DEBIT]: "Debit",
  [CardType.CREDIT]: "Credit",
  [CardType.BUSINESS_DEBIT]: "Business debit",
  [CardType.BUSINESS_CREDIT]: "Business credit",
};

// Owner colors in assignment order: the account's first person gets blue, the second purple.
export const cardColors = [
  "bg-gradient-to-br from-cyan-600 to-blue-600",
  "bg-gradient-to-br from-violet-600 to-purple-600",
  "bg-gradient-to-br from-green-600 to-teal-600",
  "bg-gradient-to-br from-red-600 to-pink-600",
  "bg-gradient-to-br from-yellow-600 to-orange-600",
  "bg-gradient-to-br from-indigo-600 to-blue-600",
  "bg-gradient-to-br from-purple-600 to-pink-600",
  "bg-gradient-to-br from-emerald-600 to-green-600",
  "bg-gradient-to-br from-rose-600 to-red-600",
  "bg-gradient-to-br from-blue-600 to-purple-600",
  "bg-gradient-to-br from-amber-600 to-yellow-600",
  "bg-gradient-to-br from-sky-600 to-cyan-600",
] as const;

/**
 * Color for a card owner. `ownerIds` is the account's people in join order
 * (from /api/users); an owner not in it falls back to a stable hash.
 */
export const getCardColor = (
  userId: string,
  ownerIds: readonly string[] = [],
): string => {
  const position = ownerIds.indexOf(userId);
  if (position !== -1) {
    return cardColors[position % cardColors.length]!;
  }

  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return cardColors[Math.abs(hash) % cardColors.length]!;
};

/**
 * Whether a card is a debit-type card (personal or business debit).
 * Centralizes the `cardType === "DEBIT" || cardType === "BUSINESS_DEBIT"`
 * check that used to be duplicated (with inconsistent definitions) across
 * the app.
 */
export const isDebitCard = (card: { cardType: string }): boolean =>
  card.cardType === CardType.DEBIT || card.cardType === CardType.BUSINESS_DEBIT;

/**
 * The oldest-created debit card in a list, used as the default payment
 * method when depositing income.
 */
export const oldestDebitCard = <
  T extends { cardType: string; createdAt: string | Date },
>(
  cards: T[],
): T | undefined =>
  [...cards]
    .filter(isDebitCard)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[0];

/**
 * Maps card type from API format to component format
 * @param cardType - The card type from the API
 * @returns The card type for the component
 */
export const mapCardType = (
  cardType: string,
): "credit" | "debit" | "business_credit" | "business_debit" | "cash" => {
  switch (cardType) {
    case CardType.CREDIT:
      return "credit";
    case CardType.BUSINESS_CREDIT:
      return "business_credit";
    case CardType.DEBIT:
      return "debit";
    case CardType.BUSINESS_DEBIT:
      return "business_debit";
    default:
      return "cash";
  }
};

// Utility function to map API card to component card
export const mapApiCardToCard = (
  apiCard: ApiCard,
  ownerIds: readonly string[] = [],
): Card => {
  const cardColor = getCardColor(apiCard.userId, ownerIds);

  return {
    id: apiCard.id ?? "",
    name: apiCard.name,
    lastFourDigits: apiCard.lastFourDigits ?? undefined,
    type: mapCardType(apiCard.cardType),
    amountSpent: apiCard.amountSpent ?? 0,
    spendingLimit: apiCard.spendingLimit,
    userId: apiCard.userId,
    user: apiCard.user?.name ?? "Unknown User",
    isActive: true, // Placeholder, replace with real status if available
    color: cardColor,
  };
};
