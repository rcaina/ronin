import { useSession } from "next-auth/react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Card } from "@prisma/client";
import type { ImportBudgetCardsData } from "@/lib/types/budget";

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

const getBudgetCards = async (
  budgetId: string,
  excludeCardPayments?: boolean,
  month?: string,
): Promise<BudgetCard[]> => {
  const params = new URLSearchParams();
  if (excludeCardPayments) params.append("excludeCardPayments", "true");
  if (month) params.append("month", month);
  const response = await fetch(
    `/api/budgets/${budgetId}/cards?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch budget cards: ${response.statusText}`);
  }
  return response.json() as Promise<BudgetCard[]>;
};

export const useBudgetCards = (
  budgetId: string,
  excludeCardPayments?: boolean,
  month?: string,
) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetCard[]>({
    queryKey: ["budgetCards", budgetId, excludeCardPayments, month],
    queryFn: () => getBudgetCards(budgetId, excludeCardPayments, month),
    placeholderData: keepPreviousData,
    enabled: !!session && !!budgetId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};

const importBudgetCards = async (
  budgetId: string,
  data: ImportBudgetCardsData,
): Promise<{ imported: number; skipped: number }> => {
  const response = await fetch(`/api/budgets/${budgetId}/cards/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to import budget cards: ${response.statusText}`);
  }

  return response.json() as Promise<{ imported: number; skipped: number }>;
};

export const useImportBudgetCards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      data,
    }: {
      budgetId: string;
      data: ImportBudgetCardsData;
    }) => importBudgetCards(budgetId, data),
    onSuccess: (_, { budgetId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["budgetCards", budgetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
    },
  });
};
