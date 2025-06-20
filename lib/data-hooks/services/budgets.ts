import type { BudgetWithRelations } from "@/lib/types/budget";

export const getBudgets = async (): Promise<BudgetWithRelations[]> => fetch("/api/budgets").then((res) => res.json()) as Promise<BudgetWithRelations[]>

export const getBudget = async (id: string): Promise<BudgetWithRelations> => {
  const response = await fetch(`/api/budgets/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget: ${response.statusText}`);
  }
  return response.json() as Promise<BudgetWithRelations>;
};




