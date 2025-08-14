import { useSession } from "next-auth/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Card } from "@prisma/client";

// Interface for budget cards with user information
interface BudgetCard extends Card {
  user: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
  };
  amountSpent: number;
}

const getBudgetCards = async (budgetId: string): Promise<BudgetCard[]> => {
  const response = await fetch(`/api/budgets/${budgetId}/cards`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget cards: ${response.statusText}`);
  }
  return response.json() as Promise<BudgetCard[]>;
};

export const useBudgetCards = (budgetId: string) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetCard[]>({
    queryKey: ["budgetCards", budgetId],
    queryFn: () => getBudgetCards(budgetId),
    placeholderData: keepPreviousData,
    enabled: !!session && !!budgetId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};