import type { Budget, Category, Transaction } from "@prisma/client";
import { useSession } from "next-auth/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TransactionSplitWithCategory } from "@/lib/types/transaction";

type BudgetTransaction = Transaction & {
  category: Category | null;
  Budget: Budget;
  splits: TransactionSplitWithCategory[];
};

const getBudgetTransactions = async (
  budgetId: string,
): Promise<BudgetTransaction[]> => {
  const response = await fetch(`/api/budgets/${budgetId}/transactions`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch budget transactions: ${response.statusText}`,
    );
  }
  return response.json() as Promise<BudgetTransaction[]>;
};

export const useBudgetTransactions = (budgetId: string) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetTransaction[]>({
    queryKey: ["budgetTransactions", budgetId],
    queryFn: () => getBudgetTransactions(budgetId),
    placeholderData: keepPreviousData,
    enabled: !!session && !!budgetId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};
