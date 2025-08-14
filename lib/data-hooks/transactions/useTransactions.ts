import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, createCardPayment } from "../services/transactions";
import type { CreateTransactionRequest, UpdateTransactionRequest, TransactionWithRelations } from "@/lib/types/transaction";
import type { CreateCardPaymentSchema } from "@/lib/api-schemas/transactions";

export const useTransactions = () => {
  const { data: session } = useSession();

  const query = useQuery<TransactionWithRelations[]>({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => createTransaction(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Invalidate and refetch budget data to update category spending amounts
      if (variables.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.budgetId] });
      }
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionRequest }) => updateTransaction(id, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Invalidate and refetch budget data to update category spending amounts
      if (variables.data.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.data.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.data.budgetId] });
      }
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, budgetId }: { id: string; budgetId?: string }) => deleteTransaction(id),
    onSuccess: (_, variables) => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Invalidate and refetch budget data to update category spending amounts
      if (variables.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.budgetId] });
      }
    },
  });
};

export const useCreateCardPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCardPaymentSchema) => createCardPayment(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch both transactions and cards
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      
      // If this card payment involves a budget, invalidate budget queries
      if (variables.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.budgetId] });
      }
    },
  });
}; 