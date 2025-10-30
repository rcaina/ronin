import type { PocketSummary } from "@/lib/types/savings";
import type { SavingsSummary } from "@/lib/types/savings";

type PocketWithAllocationsLite = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  allocations?: { amount: number }[];
};

export function toPocketSummary(pocket: PocketWithAllocationsLite): PocketSummary {
  const total = (pocket.allocations ?? []).reduce((sum, a) => sum + a.amount, 0);
  return {
    id: pocket.id,
    name: pocket.name,
    total,
    createdAt: pocket.createdAt.toISOString(),
    updatedAt: pocket.updatedAt.toISOString(),
  };
}

export function toPocketSummaryList(pockets: PocketWithAllocationsLite[]): PocketSummary[] {
  return pockets.map(toPocketSummary);
}


export type SavingsWithRelationsLite = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  budget: { id: string; name: string } | null;
  pockets: PocketWithAllocationsLite[];
};

export function toSavingsSummary(savings: SavingsWithRelationsLite): SavingsSummary {
  const pocketSummaries = toPocketSummaryList(savings.pockets);
  const total = pocketSummaries.reduce((sum, p) => sum + p.total, 0);
  return {
    id: savings.id,
    name: savings.name,
    budget: savings.budget ? { id: savings.budget.id, name: savings.budget.name } : null,
    createdAt: savings.createdAt.toISOString(),
    updatedAt: savings.updatedAt.toISOString(),
    total,
    pockets: pocketSummaries,
  };
}

export function toSavingsSummaryList(list: SavingsWithRelationsLite[]): SavingsSummary[] {
  return list.map(toSavingsSummary);
}


