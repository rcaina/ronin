import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getCards, createCard, updateCard, deleteCard, type Card as ApiCard, type CreateCardRequest, type UpdateCardRequest } from "../services/cards";

export const useCards = () => {
  const { data: session } = useSession();

  const query = useQuery<ApiCard[]>({
    queryKey: ["cards"],
    queryFn: () => getCards(),
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