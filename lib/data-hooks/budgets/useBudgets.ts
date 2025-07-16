import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBudgets, updateBudget, deleteBudget, markBudgetCompleted, markBudgetArchived, reactivateBudget } from "../services/budgets";
import type { UpdateBudgetData, CreateBudgetData } from "@/lib/api-services/budgets";
import type { BudgetStatus } from "@prisma/client";

export const useBudgets = (status?: BudgetStatus) => {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ["budgets", status],
    queryFn: () => getBudgets(status),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};

export const useActiveBudgets = () => {
  return useBudgets('ACTIVE');
};

export const useCompletedBudgets = () => {
  return useBudgets('COMPLETED');
};

export const useArchivedBudgets = () => {
  return useBudgets('ARCHIVED');
};

export const useMarkBudgetCompleted = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markBudgetCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useMarkBudgetArchived = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markBudgetArchived,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useReactivateBudget = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reactivateBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBudgetData) => {
      return fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to create budget: ${res.statusText}`);
        }
        return res.json();
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetData }) => updateBudget(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useDuplicateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budgetId: string) => {
      return fetch("/api/budgets/duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ budgetId }),
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to duplicate budget: ${res.statusText}`);
        }
        return res.json();
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};



