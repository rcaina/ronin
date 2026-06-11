import type { TransactionWithRelations } from "@/lib/types/transaction";
import type { Card, CreateCardRequest, UpdateCardRequest } from "@/lib/types/card";

export const getCards = async (excludeCardPayments?: boolean, budgetId?: string): Promise<Card[]> => {
  const params = new URLSearchParams();
  if (excludeCardPayments) params.append('excludeCardPayments', 'true');
  if (budgetId) params.append('budgetId', budgetId);
  
  const url = params.toString() ? `/api/cards?${params.toString()}` : "/api/cards";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.statusText}`);
  }
  return response.json() as Promise<Card[]>;
};

export const getCard = async (id: string, excludeCardPayments?: boolean): Promise<Card> => {
  const url = excludeCardPayments ? `/api/cards/${id}?excludeCardPayments=true` : `/api/cards/${id}`;
  const response = await fetch(url);
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