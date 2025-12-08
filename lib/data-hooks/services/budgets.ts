import type { BudgetWithRelations } from "@/lib/types/budget";
import type { UpdateBudgetData } from "@/lib/api-services/budgets";
import type { BudgetStatus } from "@prisma/client";

export const getBudgets = async (status?: BudgetStatus, excludeCardPayments?: boolean): Promise<BudgetWithRelations[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (excludeCardPayments) params.append('excludeCardPayments', 'true');
  
  const url = params.toString() ? `/api/budgets?${params.toString()}` : "/api/budgets";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch budgets: ${response.statusText}`);
  }
  const data = (await response.json()) as unknown;
  // Ensure we always return an array
  return Array.isArray(data) ? (data as BudgetWithRelations[]) : [];
};

export const getBudget = async (id: string, excludeCardPayments?: boolean): Promise<BudgetWithRelations> => {
  const params = new URLSearchParams();
  if (excludeCardPayments) params.append('excludeCardPayments', 'true');
  
  const url = params.toString() ? `/api/budgets/${id}?${params.toString()}` : `/api/budgets/${id}`;
  const response = await fetch(url);
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




