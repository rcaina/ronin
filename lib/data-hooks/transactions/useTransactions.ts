import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, createCardPayment } from "../services/transactions";
import type { CreateTransactionRequest, UpdateTransactionRequest, TransactionWithRelations } from "@/lib/types/transaction";
import type { CreateCardPaymentSchema } from "@/lib/api-schemas/transactions";

export const useTransactions = (page = 1, limit = 20) => {
  const { data: session } = useSession();

  const query = useQuery<{
    transactions: TransactionWithRelations[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>({
    queryKey: ["transactions", page, limit],
    queryFn: () => getTransactions(page, limit),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};

// Hook for getting all transactions (used in dashboard)
export const useAllTransactions = () => {
  const { data: session } = useSession();

  const query = useQuery<TransactionWithRelations[]>({
    queryKey: ["allTransactions"],
    queryFn: async () => {
      // Get all transactions by requesting a large page size
      const response = await getTransactions(1, 10000);
      return response.transactions;
    },
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
      // Invalidate and refetch budget transactions for the specific budget
      if (variables.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budgetTransactions", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.budgetId] });
        // Also invalidate budget cards for this budget
        void queryClient.invalidateQueries({ queryKey: ["budgetCards", variables.budgetId] });
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
      // Invalidate and refetch budget transactions for the specific budget
      if (variables.data.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budgetTransactions", variables.data.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.data.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.data.budgetId] });
        // Also invalidate budget cards for this budget
        void queryClient.invalidateQueries({ queryKey: ["budgetCards", variables.data.budgetId] });
      }
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; budgetId?: string }) => deleteTransaction(data.id),
    onSuccess: (_, variables) => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Invalidate and refetch budget transactions for the specific budget
      if (variables.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budgetTransactions", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.budgetId] });
        // Also invalidate budget cards for this budget
        void queryClient.invalidateQueries({ queryKey: ["budgetCards", variables.budgetId] });
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
        void queryClient.invalidateQueries({ queryKey: ["budgetTransactions", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budget", variables.budgetId] });
        void queryClient.invalidateQueries({ queryKey: ["budgetCategories", variables.budgetId] });
        // Also invalidate budget cards for this budget
        void queryClient.invalidateQueries({ queryKey: ["budgetCards", variables.budgetId] });
      }
    },
  });
}; 