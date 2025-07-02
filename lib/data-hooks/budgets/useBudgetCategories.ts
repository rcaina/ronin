import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export interface CreateBudgetCategoryData {
  categoryName: string;
  group: "needs" | "wants" | "investment";
  allocatedAmount: number;
}

const createBudgetCategory = async (
  budgetId: string,
  data: CreateBudgetCategoryData
): Promise<BudgetCategoryWithCategory> => {
  const response = await fetch(`/api/budgets/${budgetId}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create budget category: ${response.statusText}`);
  }

  const result = await response.json() as { budgetCategory: BudgetCategoryWithCategory };
  return result.budgetCategory;
};

export interface UpdateBudgetCategoryData {
  allocatedAmount?: number;
  categoryId?: string;
}

interface BudgetCategoryResponse {
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
}

const updateBudgetCategory = async (
  budgetId: string,
  categoryId: string,
  data: UpdateBudgetCategoryData
): Promise<BudgetCategoryResponse> => {
  const response = await fetch(`/api/budgets/${budgetId}/categories/${categoryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update budget category: ${response.statusText}`);
  }

  const result = await response.json() as { budgetCategory: BudgetCategoryResponse };
  return result.budgetCategory;
};

const deleteBudgetCategory = async (
  budgetId: string,
  categoryId: string
): Promise<void> => {
  const response = await fetch(`/api/budgets/${budgetId}/categories/${categoryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete budget category: ${response.statusText}`);
  }
};

export const useCreateBudgetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      data,
    }: {
      budgetId: string;
      data: CreateBudgetCategoryData;
    }) => createBudgetCategory(budgetId, data),
    onSuccess: (_, { budgetId }) => {
      // Invalidate and refetch the specific budget
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
      // Also invalidate the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useUpdateBudgetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      categoryId,
      data,
    }: {
      budgetId: string;
      categoryId: string;
      data: UpdateBudgetCategoryData;
    }) => updateBudgetCategory(budgetId, categoryId, data),
    onSuccess: (_, { budgetId }) => {
      // Invalidate and refetch the specific budget
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
      // Also invalidate the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useDeleteBudgetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      categoryId,
    }: {
      budgetId: string;
      categoryId: string;
    }) => deleteBudgetCategory(budgetId, categoryId),
    onSuccess: (_, { budgetId }) => {
      // Invalidate and refetch the specific budget
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
      // Also invalidate the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}; 