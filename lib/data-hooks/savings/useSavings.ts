import { keepPreviousData, useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { SavingsSummary } from "@/lib/types/savings";
import { addSavings, getSavings } from "../services/savings";
import type { CreateSavingsSchema } from "@/lib/api-schemas/savings";

export const savingsKey = ["savings", "accounts"];

export const useSavings = () => {
  const { data: session } = useSession();

  return useQuery<SavingsSummary[]>({
    queryKey: savingsKey,
    queryFn: async () => {
      const res = await getSavings();
      if (!res.ok) throw new Error("Failed to load savings accounts");
      return (await res.json()) as SavingsSummary[];
    },
    enabled: !!session,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
};


export const useSavingsMutations = () => {

  const isSaving  = useIsMutating({
    mutationKey: savingsKey,
  }) > 0

  return {
    addSavings: useCreateSavings,
    isSaving,
  }
};

export const useCreateSavings = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationKey: savingsKey,
    //call hook to create savings
    mutationFn: (data: CreateSavingsSchema) =>  addSavings(data),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
}

export const useSavingsAccount = (id: string) => {
  const { data: session } = useSession();

  return useQuery<SavingsSummary>({
    queryKey: [...savingsKey, id],
    queryFn: async () => {
      const res = await fetch(`/api/savings/${id}`);
      if (!res.ok) throw new Error("Failed to load savings account");
      return (await res.json()) as SavingsSummary;
    },
    enabled: !!session && !!id,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
};

