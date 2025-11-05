import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { PocketSummary } from "@/lib/types/savings";
import type { AllocationSummary } from "@/lib/types/savings";
import type { CreateAllocationSchema, UpdateAllocationSchema } from "@/lib/api-schemas/savings";
import { pocketsKey } from "./usePockets";
import { savingsKey } from "./useSavings";

export const pocketKey = (pocketId: string) => [...pocketsKey, pocketId] as const;

export const usePocket = (pocketId: string) => {
  const { data: session } = useSession();

  return useQuery<PocketSummary>({
    queryKey: pocketKey(pocketId),
    queryFn: async () => {
      const res = await fetch(`/api/savings/pockets/${pocketId}`);
      if (!res.ok) throw new Error("Failed to load pocket");
      return (await res.json()) as PocketSummary;
    },
    enabled: !!session && !!pocketId,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
};

const createAllocation = async (data: CreateAllocationSchema) => {
  const res = await fetch(`/api/savings/allocations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create allocation");
  return (await res.json()) as AllocationSummary;
};

export const useCreateAllocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["savings", "allocations"],
    mutationFn: (data: CreateAllocationSchema) => createAllocation(data),
    onSuccess: (_data, variables) => {
      // Invalidate pocket query to refresh allocations
      void qc.invalidateQueries({ queryKey: pocketKey(variables.pocketId) });
      void qc.invalidateQueries({ queryKey: pocketsKey });
      // Invalidate all savings account queries (prefix matching will catch ["savings", "accounts", id])
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};

const updateAllocation = async (allocationId: string, data: UpdateAllocationSchema) => {
  const res = await fetch(`/api/savings/allocations/${allocationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update allocation");
  return (await res.json()) as AllocationSummary;
};

export const useUpdateAllocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["savings", "allocations"],
    mutationFn: ({ allocationId, data }: { allocationId: string; data: UpdateAllocationSchema }) => 
      updateAllocation(allocationId, data),
    onSuccess: () => {
      // Invalidate all pocket queries and savings queries to refresh allocations
      void qc.invalidateQueries({ queryKey: pocketsKey });
      // Invalidate all savings account queries (prefix matching will catch ["savings", "accounts", id])
      void qc.invalidateQueries({ queryKey: savingsKey });
    },
  });
};

