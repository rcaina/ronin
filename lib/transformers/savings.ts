import type { PocketSummary } from "@/lib/types/savings";
import type { SavingsSummary } from "@/lib/types/savings";

type AllocationWithTransaction = {
  id: string;
  amount: number;
  createdAt: Date;
  transaction?: {
    id: string;
    name: string | null;
    amount: number;
    createdAt: Date;
  };
};

type PocketWithAllocationsLite = {
  id: string;
  name: string;
  goalAmount?: number | null;
  goalDate?: Date | null;
  goalNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  allocations?: AllocationWithTransaction[];
};

export function toPocketSummary(pocket: PocketWithAllocationsLite): PocketSummary {
  const total = (pocket.allocations ?? []).reduce((sum, a) => {
    const amount = typeof a.amount === 'number' && !isNaN(a.amount) ? a.amount : 0;
    return sum + amount;
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
        createdAt: a.createdAt.toISOString(),
        transaction: a.transaction ? {
          id: a.transaction.id,
          name: a.transaction.name,
          amount: a.transaction.amount,
          createdAt: a.transaction.createdAt.toISOString(),
        } : undefined,
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
  budget: { id: string; name: string } | null;
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


