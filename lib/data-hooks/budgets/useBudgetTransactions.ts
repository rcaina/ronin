import type { Budget, BudgetCategory, Category, Transaction } from "@prisma/client";
import { useSession } from "next-auth/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const getBudgetTransactions = async (budgetId: string): Promise<(Transaction & { category: (BudgetCategory & { category: Category }) | null, Budget: Budget })[]> => {
  const response = await fetch(`/api/budgets/${budgetId}/transactions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget transactions: ${response.statusText}`);
  }
  return response.json() as Promise<(Transaction & { category: (BudgetCategory & { category: Category }) | null, Budget: Budget })[]>;
};

export const useBudgetTransactions = (budgetId: string) => {
  const { data: session } = useSession();

  const query = useQuery<(Transaction & { category: (BudgetCategory & { category: Category }) | null, Budget: Budget })[]>({
    queryKey: ["budgetTransactions", budgetId],
    queryFn: () => getBudgetTransactions(budgetId),
    placeholderData: keepPreviousData,
    enabled: !!session && !!budgetId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};