import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, type CreateTransactionRequest, type UpdateTransactionRequest } from "../services/transactions";
import type { TransactionWithRelations } from "../services/transactions";

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
    onSuccess: () => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionRequest }) => updateTransaction(id, data),
    onSuccess: () => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      // Invalidate and refetch transactions
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}; 