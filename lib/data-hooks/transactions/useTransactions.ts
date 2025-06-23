import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getTransactions, createTransaction, type CreateTransactionRequest } from "../services/transactions";
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