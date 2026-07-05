import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  getCards,
  getCard,
  getCardTransactions,
  createCard,
  updateCard,
  deleteCard,
  mergeCards,
} from "../services/cards";
import type {
  Card as ApiCard,
  CreateCardRequest,
  UpdateCardRequest,
  MergeCardsRequest,
} from "@/lib/types/card";
import type { TransactionWithRelations } from "@/lib/types/transaction";

export const useCards = (excludeCardPayments?: boolean, budgetId?: string) => {
  const { data: session } = useSession();

  const query = useQuery<ApiCard[]>({
    queryKey: ["cards", excludeCardPayments, budgetId],
    queryFn: () => getCards(excludeCardPayments, budgetId),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return query;
};

// General (template) cards — one per distinct card identity, with
// amountSpent rolled up across every budget card linked to it.
export const useGeneralCards = () => {
  const { data: session } = useSession();

  const query = useQuery<ApiCard[]>({
    queryKey: ["cards", "general"],
    queryFn: () => getCards(undefined, undefined, true),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return query;
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCardRequest) => createCard(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch cards
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      // Also invalidate budget cards if budgetId is provided
      if (variables.budgetId) {
        void queryClient.invalidateQueries({
          queryKey: ["budgetCards", variables.budgetId],
        });
        // Invalidate the specific budget to refresh budget pages
        void queryClient.invalidateQueries({
          queryKey: ["budget", variables.budgetId],
        });
      }
    },
  });
};

export const useUpdateCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCardRequest }) =>
      updateCard(id, data),
    onSuccess: () => {
      // Invalidate and refetch cards
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      // Also invalidate all budget cards queries since we don't know which budget the card belongs to
      void queryClient.invalidateQueries({ queryKey: ["budgetCards"] });
      // Invalidate all budget queries since card updates could affect any budget
      void queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
};

export const useDeleteCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      // Invalidate and refetch cards
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      // Also invalidate all budget cards queries since we don't know which budget the card belonged to
      void queryClient.invalidateQueries({ queryKey: ["budgetCards"] });
      // Invalidate all budget queries since card deletions could affect any budget
      void queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
};

// Merge two or more of the user's own general (template) cards into one
// they've explicitly chosen as the survivor. Uses the same invalidation set
// as delete, since a merge both removes cards and can move budget cards /
// transactions across whichever budgets they belonged to.
export const useMergeCards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MergeCardsRequest) => mergeCards(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      void queryClient.invalidateQueries({ queryKey: ["budgetCards"] });
      void queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
};

export const useCard = (id: string, excludeCardPayments?: boolean) => {
  const { data: session } = useSession();

  const query = useQuery<ApiCard>({
    queryKey: ["cards", id, excludeCardPayments],
    queryFn: () => getCard(id, excludeCardPayments),
    placeholderData: keepPreviousData,
    enabled: !!session && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return query;
};

export const useCardTransactions = (id: string) => {
  const { data: session } = useSession();

  const query = useQuery<TransactionWithRelations[]>({
    queryKey: ["cards", id, "transactions"],
    queryFn: () => getCardTransactions(id),
    placeholderData: keepPreviousData,
    enabled: !!session && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return query;
};
