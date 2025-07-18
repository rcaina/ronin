import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getCards, getCard, getCardTransactions, createCard, updateCard, deleteCard, type Card as ApiCard, type CreateCardRequest, type UpdateCardRequest } from "../services/cards";
import type { TransactionWithRelations } from "@/lib/types/transaction";

export const useCards = (excludeCardPayments?: boolean) => {
  const { data: session } = useSession();

  const query = useQuery<ApiCard[]>({
    queryKey: ["cards", excludeCardPayments],
    queryFn: () => getCards(excludeCardPayments),
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
    onSuccess: () => {
      // Invalidate and refetch cards
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
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