export interface AllocationSummary {
  id: string;
  amount: number;
  createdAt: string;
  transaction?: {
    id: string;
    name: string | null;
    amount: number;
    createdAt: string;
  };
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
  budget: { id: string; name: string } | null;
  total: number;
  createdAt: string;
  updatedAt: string;
  pockets: PocketSummary[];
}



