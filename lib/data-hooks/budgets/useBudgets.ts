import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  getBudgets,
  updateBudget,
  deleteBudget,
  markBudgetCompleted,
  markBudgetArchived,
  reactivateBudget,
  createBudget,
  duplicateBudget,
} from "../services/budgets";
import type { UpdateBudgetData } from "@/lib/api-services/budgets";
import type { BudgetStatus } from "@prisma/client";

type CreateBudgetVariables = Parameters<typeof createBudget>[0];
type CreateBudgetResponse = Awaited<ReturnType<typeof createBudget>>;

type DuplicateBudgetVariables = Parameters<typeof duplicateBudget>[0];
type DuplicateBudgetResponse = Awaited<ReturnType<typeof duplicateBudget>>;

export const useBudgets = (status?: BudgetStatus, excludeCardPayments?: boolean) => {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ["budgets", status, excludeCardPayments],
    queryFn: () => getBudgets(status, excludeCardPayments),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
    select: (data) => {
      // Ensure data is always an array, even if placeholderData or cached data is not
      return Array.isArray(data) ? data : [];
    },
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

  return useMutation<CreateBudgetResponse, Error, CreateBudgetVariables>({
    mutationFn: createBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetData }) => updateBudget(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both the specific budget and the budgets list
      void queryClient.invalidateQueries({ queryKey: ["budget", variables.id] });
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

  return useMutation<DuplicateBudgetResponse, Error, DuplicateBudgetVariables>({
    mutationFn: duplicateBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
};



