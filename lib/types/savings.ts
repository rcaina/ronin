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
  // True when this pocket is read-only after a downgrade past the free-tier
  // pocket limit (see lib/utils/entitlements.ts isPocketLocked).
  locked: boolean;
}

export interface SavingsSummary {
  id: string;
  name: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  pockets: PocketSummary[];
}

export interface UpdatePocketData {
  name?: string;
  goalAmount?: number | null;
  goalDate?: string | null;
  goalNote?: string | null;
}
