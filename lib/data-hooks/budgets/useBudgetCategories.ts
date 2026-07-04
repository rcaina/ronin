import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type {
  BudgetCategoryWithCategory,
  CreateBudgetCategoryData,
  UpdateBudgetCategoryData,
  ImportBudgetCategoriesData,
} from "@/lib/types/budget";

const getBudgetCategories = async (
  budgetId: string,
  searchQuery?: string,
): Promise<BudgetCategoryWithCategory[]> => {
  const url = new URL(
    `/api/budgets/${budgetId}/categories`,
    window.location.origin,
  );
  if (searchQuery?.trim()) {
    url.searchParams.set("search", searchQuery.trim());
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Failed to fetch budget categories: ${response.statusText}`,
    );
  }
  return response.json() as Promise<BudgetCategoryWithCategory[]>;
};

export const useBudgetCategories = (budgetId: string, searchQuery?: string) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetCategoryWithCategory[]>({
    queryKey: ["budgetCategories", budgetId, searchQuery],
    queryFn: () => getBudgetCategories(budgetId, searchQuery),
    placeholderData: keepPreviousData,
    enabled: !!session && !!budgetId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};

const createBudgetCategory = async (
  budgetId: string,
  data: CreateBudgetCategoryData,
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

  const budgetCategory = (await response.json()) as BudgetCategoryWithCategory;
  return budgetCategory;
};

const updateBudgetCategory = async (
  budgetId: string,
  categoryId: string,
  data: UpdateBudgetCategoryData,
): Promise<BudgetCategoryWithCategory> => {
  const response = await fetch(
    `/api/budgets/${budgetId}/categories/${categoryId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to update budget category: ${response.statusText}`);
  }

  const budgetCategory = (await response.json()) as BudgetCategoryWithCategory;
  return budgetCategory;
};

const importBudgetCategories = async (
  budgetId: string,
  data: ImportBudgetCategoriesData,
): Promise<{ imported: number; skipped: number }> => {
  const response = await fetch(`/api/budgets/${budgetId}/categories/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to import budget categories: ${response.statusText}`,
    );
  }

  return response.json() as Promise<{ imported: number; skipped: number }>;
};

const deleteBudgetCategory = async (
  budgetId: string,
  categoryId: string,
): Promise<void> => {
  const response = await fetch(
    `/api/budgets/${budgetId}/categories/${categoryId}`,
    {
      method: "DELETE",
    },
  );

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
      // Invalidate and refetch the budget categories
      void queryClient.invalidateQueries({
        queryKey: ["budgetCategories", budgetId],
      });
      // Also invalidate the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      // Invalidate the specific budget to refresh the main page
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
      // Creating a budget category may create a new default (template)
      // category, so refresh the default categories list too.
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
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
      // Invalidate and refetch the budget categories
      void queryClient.invalidateQueries({
        queryKey: ["budgetCategories", budgetId],
      });
      // Also invalidate the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      // Invalidate the specific budget to refresh the main page
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
    },
  });
};

export const useImportBudgetCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      data,
    }: {
      budgetId: string;
      data: ImportBudgetCategoriesData;
    }) => importBudgetCategories(budgetId, data),
    onSuccess: (_, { budgetId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["budgetCategories", budgetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
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
      // Invalidate and refetch the budget categories
      void queryClient.invalidateQueries({
        queryKey: ["budgetCategories", budgetId],
      });
      // Also invalidate the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      // Invalidate the specific budget to refresh the main page
      void queryClient.invalidateQueries({ queryKey: ["budget", budgetId] });
    },
  });
};
