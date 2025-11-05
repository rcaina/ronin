import type { PocketSummary, AllocationSummary } from "@/lib/types/savings";
import type { SavingsSummary } from "@/lib/types/savings";

type AllocationLite = {
  id: string;
  amount: number;
  withdrawal: boolean;
  note?: string | null;
  createdAt: Date;
};

type PocketWithAllocationsLite = {
  id: string;
  name: string;
  goalAmount?: number | null;
  goalDate?: Date | null;
  goalNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  allocations?: AllocationLite[];
};

export function toPocketSummary(pocket: PocketWithAllocationsLite): PocketSummary {
  const total = (pocket.allocations ?? []).reduce((sum, a) => {
    const amount = typeof a.amount === 'number' && !isNaN(a.amount) ? a.amount : 0;
    // Subtract if it's a withdrawal, add if it's a deposit
    return sum + (a.withdrawal ? -amount : amount);
  }, 0);
  return {
    id: pocket.id,
    name: pocket.name,
    total,
    createdAt: pocket.createdAt.toISOString(),
    updatedAt: pocket.updatedAt.toISOString(),
    goalAmount: pocket.goalAmount ?? null,
    goalDate: pocket.goalDate ? pocket.goalDate.toISOString() : null,
    goalNote: pocket.goalNote ?? null,
    allocations: (pocket.allocations ?? []).map((a) => {
      const amount = typeof a.amount === 'number' && !isNaN(a.amount) ? a.amount : 0;
      return {
        id: a.id,
        amount,
        withdrawal: a.withdrawal ?? false,
        note: a.note ?? undefined,
        createdAt: a.createdAt.toISOString(),
      };
    }),
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
  pockets: PocketWithAllocationsLite[];
};

export function toSavingsSummary(savings: SavingsWithRelationsLite): SavingsSummary {
  const pocketSummaries = toPocketSummaryList(savings.pockets);
  const total = pocketSummaries.reduce((sum, p) => {
    const pocketTotal = typeof p.total === 'number' && !isNaN(p.total) ? p.total : 0;
    return sum + pocketTotal;
  }, 0);
  return {
    id: savings.id,
    name: savings.name,
    createdAt: savings.createdAt.toISOString(),
    updatedAt: savings.updatedAt.toISOString(),
    total,
    pockets: pocketSummaries,
  };
}

export function toSavingsSummaryList(list: SavingsWithRelationsLite[]): SavingsSummary[] {
  return list.map(toSavingsSummary);
}

export function toAllocationSummary(allocation: {
  id: string;
  amount: number;
  withdrawal: boolean;
  note?: string | null;
  createdAt: Date;
}): AllocationSummary {
  return {
    id: allocation.id,
    amount: allocation.amount,
    withdrawal: allocation.withdrawal ?? false,
    note: allocation.note ?? undefined,
    createdAt: allocation.createdAt.toISOString(),
  };
}


