import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getCards, getCard, getCardTransactions, createCard, updateCard, deleteCard, type Card as ApiCard, type CreateCardRequest, type UpdateCardRequest } from "../services/cards";
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

export const useCreateCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCardRequest) => createCard(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch cards
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      // Also invalidate budget cards if budgetId is provided
      if (variables.budgetId) {
        void queryClient.invalidateQueries({ queryKey: ["budgetCards", variables.budgetId] });
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
    },
  });
};

export const useCard = (id: string) => {
  const { data: session } = useSession();

  const query = useQuery<ApiCard>({
    queryKey: ["cards", id],
    queryFn: () => getCard(id),
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