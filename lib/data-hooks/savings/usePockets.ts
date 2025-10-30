import { keepPreviousData, useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { PocketSummary } from "@/lib/types/savings";
import type { CreatePocketSchema } from "@/lib/api-schemas/savings";
import { getPockets, addPocket } from "../services/pockets";
import { savingsKey } from "./useSavings";

export const pocketsKey = ["savings", "pockets"] as const;
export const pocketsKeyBySavings = (savingsId?: string) => [...pocketsKey, savingsId ?? "all"] as const;

export const usePockets = (savingsId?: string) => {
  const { data: session } = useSession();

  return useQuery<PocketSummary[]>({
    queryKey: pocketsKeyBySavings(savingsId),
    queryFn: async () => {
      const res = await getPockets(savingsId);
      if (!res.ok) throw new Error("Failed to load savings pockets");
      return (await res.json()) as PocketSummary[];
    },
    enabled: !!session,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
};

export const usePocketsMutations = () => {
  const isSaving = useIsMutating({ mutationKey: pocketsKey }) > 0;
  return {
    addPocket: useCreatePocket,
    isSaving,
  };
};

export const useCreatePocket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: pocketsKey,
    mutationFn: (data: CreatePocketSchema) => addPocket(data),
    onSettled: (_data, _error, variables) => {
      // refresh pockets for the specific savings and overall savings totals
      const savingsId = (variables as CreatePocketSchema | undefined)?.savingsId;
      if (savingsId) {
        void qc.invalidateQueries({ queryKey: pocketsKeyBySavings(savingsId) });
      }
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
    onSuccess: (_data, variables) => {
      const savingsId = (variables as CreatePocketSchema | undefined)?.savingsId;
      if (savingsId) {
        void qc.invalidateQueries({ queryKey: pocketsKeyBySavings(savingsId) });
      }
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};


