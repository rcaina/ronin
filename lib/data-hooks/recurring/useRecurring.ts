import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
} from "../services/recurring";
import type {
  CreateRecurringTransactionRequest,
  UpdateRecurringTransactionRequest,
} from "@/lib/types/recurring";

export const recurringTransactionsKey = ["recurring"] as const;

/** Recurring templates for the account — readable by any member (free
 * accounts see their existing templates read-only; see the management page). */
export const useRecurringTransactions = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: recurringTransactionsKey,
    queryFn: getRecurringTransactions,
    enabled: !!session,
    staleTime: 60 * 1000,
  });
};

// A recurring template can post a transaction into any budget/card, and
// posting also touches the transactions list — invalidate broadly rather
// than trying to track which budgets/cards were affected.
const invalidateRecurringAndTransactions = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  void queryClient.invalidateQueries({ queryKey: recurringTransactionsKey });
  void queryClient.invalidateQueries({ queryKey: ["transactions"] });
  void queryClient.invalidateQueries({ queryKey: ["allTransactions"] });
  void queryClient.invalidateQueries({ queryKey: ["budget"] });
  void queryClient.invalidateQueries({ queryKey: ["budgets"] });
};

export const useCreateRecurringTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringTransactionRequest) =>
      createRecurringTransaction(data),
    onSuccess: () => invalidateRecurringAndTransactions(queryClient),
  });
};

export const useUpdateRecurringTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRecurringTransactionRequest;
    }) => updateRecurringTransaction(id, data),
    onSuccess: () => invalidateRecurringAndTransactions(queryClient),
  });
};

type UpdateMutation = ReturnType<typeof useUpdateRecurringTransaction>;

/** Convenience wrapper over the update mutation for the pause/resume toggle. */
export const useToggleRecurringTransactionPaused = () => {
  const mutation = useUpdateRecurringTransaction();
  return {
    ...mutation,
    mutate: (
      args: { id: string; paused: boolean },
      options?: Parameters<UpdateMutation["mutate"]>[1],
    ) =>
      mutation.mutate({ id: args.id, data: { paused: args.paused } }, options),
    mutateAsync: (args: { id: string; paused: boolean }) =>
      mutation.mutateAsync({ id: args.id, data: { paused: args.paused } }),
  };
};

export const useDeleteRecurringTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringTransaction(id),
    onSuccess: () => invalidateRecurringAndTransactions(queryClient),
  });
};
