import type { CardType } from "@prisma/client";

/** Card shape returned by the /api/cards endpoints (dates serialized, amountSpent computed). */
export interface Card {
  id: string;
  name: string;
  lastFourDigits?: string | null;
  cardType: CardType;
  amountSpent?: number;
  spendingLimit?: number;
  userId: string;
  /** null for general (template) cards; set for cards that belong to a budget. */
  budgetId?: string | null;
  defaultCardId?: string | null;
  user: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
  };
  deleted?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardRequest {
  name: string;
  lastFourDigits?: string;
  cardType: CardType;
  spendingLimit?: number;
  userId: string;
  budgetId?: string;
}

export interface UpdateCardRequest {
  name?: string;
  lastFourDigits?: string;
  cardType?: CardType;
  spendingLimit?: number;
  budgetId?: string;
  userId?: string;
}
