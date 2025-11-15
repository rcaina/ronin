export interface AllocationSummary {
  id: string;
  amount: number;
  withdrawal: boolean;
  note?: string;
  occurredAt?: string;
  createdAt: string;
}

export interface PocketSummary {
  id: string;
  name: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  goalAmount?: number | null;
  goalDate?: string | null;
  goalNote?: string | null;
  allocations?: AllocationSummary[];
}

export interface SavingsSummary {
  id: string;
  name: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  pockets: PocketSummary[];
}



