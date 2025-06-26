import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export type BudgetCategoryWithCategory = {
  id: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  createdAt: string;
  updatedAt: string;
  deleted: string | null;
  category: {
    id: string;
    name: string;
    group: string;
  };
};

const getBudgetCategories = async (budgetId: string): Promise<BudgetCategoryWithCategory[]> => {
  const response = await fetch(`/api/budgets/${budgetId}/categories`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget categories: ${response.statusText}`);
  }
  return response.json() as Promise<BudgetCategoryWithCategory[]>;
};

export const useBudgetCategories = (budgetId: string) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetCategoryWithCategory[]>({
    queryKey: ["budgetCategories", budgetId],
    queryFn: () => getBudgetCategories(budgetId),
    placeholderData: keepPreviousData,
    enabled: !!session && !!budgetId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
}; 