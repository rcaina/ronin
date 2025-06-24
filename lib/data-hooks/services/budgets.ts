import type { BudgetWithRelations } from "@/lib/types/budget";
import type { UpdateBudgetData } from "@/lib/api-services/budgets";

export const getBudgets = async (): Promise<BudgetWithRelations[]> => fetch("/api/budgets").then((res) => res.json()) as Promise<BudgetWithRelations[]>

export const getBudget = async (id: string): Promise<BudgetWithRelations> => {
  const response = await fetch(`/api/budgets/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget: ${response.statusText}`);
  }
  return response.json() as Promise<BudgetWithRelations>;
};

export const updateBudget = async (id: string, data: UpdateBudgetData): Promise<BudgetWithRelations> => {
  const response = await fetch(`/api/budgets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update budget: ${response.statusText}`);
  }
  
  return response.json() as Promise<BudgetWithRelations>;
};

export const deleteBudget = async (id: string): Promise<void> => {
  const response = await fetch(`/api/budgets/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete budget: ${response.statusText}`);
  }
};




