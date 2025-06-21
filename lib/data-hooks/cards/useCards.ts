import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getCards, createCard, updateCard, deleteCard, type Card as ApiCard, type CreateCardRequest, type UpdateCardRequest } from "../services/cards";

// Component interface for cards
export interface Card {
  id: string;
  name: string;
  type: "credit" | "debit";
  amountSpent: number;
  spendingLimit?: number;
  user: string;
  isActive: boolean;
  color: string;
}

// Utility function to map API card to component card
export const mapApiCardToCard = (apiCard: ApiCard): Card => ({
  id: apiCard.id,
  name: apiCard.name,
  type: apiCard.cardType === "CREDIT" ? "credit" : "debit",
  amountSpent: apiCard.amountSpent ?? 0,
  spendingLimit: apiCard.spendingLimit,
  user: apiCard.user?.name || "Unknown User",
  isActive: true, // Placeholder, replace with real status if available
  color: "bg-gradient-to-br from-blue-600 to-purple-600", // Placeholder, could be based on bank/type
});

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