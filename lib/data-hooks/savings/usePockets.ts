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
        void qc.invalidateQueries({ queryKey: ["savings", "account", savingsId] });
      }
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
    onSuccess: (_data, variables) => {
      const savingsId = (variables as CreatePocketSchema | undefined)?.savingsId;
      if (savingsId) {
        void qc.invalidateQueries({ queryKey: pocketsKeyBySavings(savingsId) });
        void qc.invalidateQueries({ queryKey: ["savings", "account", savingsId] });
      }
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};

export interface UpdatePocketData {
  name?: string;
  goalAmount?: number | null;
  goalDate?: string | null;
  goalNote?: string | null;
}

const updatePocket = async (pocketId: string, data: UpdatePocketData) => {
  const res = await fetch(`/api/savings/pockets/${pocketId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update pocket");
  return (await res.json()) as PocketSummary;
};

const deletePocket = async (pocketId: string) => {
  const res = await fetch(`/api/savings/pockets/${pocketId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete pocket");
};

export const useUpdatePocket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: pocketsKey,
    mutationFn: ({ pocketId, data }: { pocketId: string; data: UpdatePocketData }) => updatePocket(pocketId, data),
    onSuccess: () => {
      // Invalidate all pocket queries and savings queries
      void qc.invalidateQueries({ queryKey: pocketsKey });
      // Invalidate all savings account queries (prefix matching will catch ["savings", "accounts", id])
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};

export const useDeletePocket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: pocketsKey,
    mutationFn: (pocketId: string) => deletePocket(pocketId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pocketsKey });
      // Invalidate all savings account queries (prefix matching will catch ["savings", "accounts", id])
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};

const deleteAllocation = async (allocationId: string) => {
  const res = await fetch(`/api/savings/allocations/${allocationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete allocation");
};

export const useDeleteAllocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["savings", "allocations"],
    mutationFn: (allocationId: string) => deleteAllocation(allocationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pocketsKey });
      // Invalidate all savings account queries (prefix matching will catch ["savings", "accounts", id])
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};


