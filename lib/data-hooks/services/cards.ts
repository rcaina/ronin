import type { CardType } from "@prisma/client";
import type { TransactionWithRelations } from "@/lib/types/transaction";

export interface Card {
  id: string;
  name: string;
  cardType: CardType;
  amountSpent?: number;
  spendingLimit?: number;
  userId: string;
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
  cardType: CardType;
  spendingLimit?: number;
}

export interface UpdateCardRequest {
  name?: string;
  cardType?: CardType;
  spendingLimit?: number;
}

export const getCards = async (): Promise<Card[]> => {
  const response = await fetch("/api/cards");
  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.statusText}`);
  }
  return response.json() as Promise<Card[]>;
};

export const getCard = async (id: string): Promise<Card> => {
  const response = await fetch(`/api/cards/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch card: ${response.statusText}`);
  }
  return response.json() as Promise<Card>;
};

export const createCard = async (data: CreateCardRequest): Promise<Card> => {
  const response = await fetch("/api/cards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create card: ${response.statusText}`);
  }
  return response.json() as Promise<Card>;
};

export const updateCard = async (id: string, data: UpdateCardRequest): Promise<Card> => {
  const response = await fetch(`/api/cards/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update card: ${response.statusText}`);
  }
  return response.json() as Promise<Card>;
};

export const deleteCard = async (id: string): Promise<void> => {
  const response = await fetch(`/api/cards/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete card: ${response.statusText}`);
  }
};

export const getCardTransactions = async (id: string): Promise<TransactionWithRelations[]> => {
  const response = await fetch(`/api/cards/${id}/transactions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch card transactions: ${response.statusText}`);
  }
  return response.json() as Promise<TransactionWithRelations[]>;
}; 