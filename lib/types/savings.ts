export interface PocketSummary {
  id: string;
  name: string;
  total: number;
  createdAt: string;
  updatedAt: string;
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



