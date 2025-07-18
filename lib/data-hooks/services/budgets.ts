import type { BudgetWithRelations } from "@/lib/types/budget";
import type { UpdateBudgetData } from "@/lib/api-services/budgets";
import type { BudgetStatus } from "@prisma/client";

export const getBudgets = async (status?: BudgetStatus): Promise<BudgetWithRelations[]> => {
  const url = status ? `/api/budgets?status=${status}` : "/api/budgets";
  return fetch(url).then((res) => res.json()) as Promise<BudgetWithRelations[]>;
};

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

export const markBudgetCompleted = async (id: string): Promise<void> => {
  const response = await fetch(`/api/budgets/${id}/complete`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark budget as completed: ${response.statusText}`);
  }
};

export const markBudgetArchived = async (id: string): Promise<void> => {
  const response = await fetch(`/api/budgets/${id}/archive`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to archive budget: ${response.statusText}`);
  }
};

export const reactivateBudget = async (id: string): Promise<void> => {
  const response = await fetch(`/api/budgets/${id}/reactivate`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to reactivate budget: ${response.statusText}`);
  }
};




