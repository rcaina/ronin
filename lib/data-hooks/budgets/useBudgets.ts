import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBudgets, updateBudget, deleteBudget, markBudgetCompleted, markBudgetArchived, reactivateBudget } from "../services/budgets";
import type { UpdateBudgetData, CreateBudgetData } from "@/lib/api-services/budgets";
import type { BudgetStatus } from "@prisma/client";

export const useBudgets = (status?: BudgetStatus, excludeCardPayments?: boolean) => {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ["budgets", status, excludeCardPayments],
    queryFn: () => getBudgets(status, excludeCardPayments),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};

export const useActiveBudgets = (excludeCardPayments?: boolean) => {
  return useBudgets('ACTIVE', excludeCardPayments);
};

export const useCompletedBudgets = (excludeCardPayments?: boolean) => {
  return useBudgets('COMPLETED', excludeCardPayments);
};

export const useArchivedBudgets = (excludeCardPayments?: boolean) => {
  return useBudgets('ARCHIVED', excludeCardPayments);
};

export const useMarkBudgetCompleted = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markBudgetCompleted,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useMarkBudgetArchived = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markBudgetArchived,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useReactivateBudget = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reactivateBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
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



