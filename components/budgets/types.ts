import type {
  StrategyType,
  PeriodType,
  CategoryType,
  CardType,
} from "@prisma/client";

/** Card entry for the create/duplicate budget wizard (to copy or add) */
export interface CardToInclude {
  id: string;
  name: string;
  lastFourDigits?: string;
  cardType: CardType;
  spendingLimit?: number;
  userId: string;
  user?: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

// Form data type
export interface CreateBudgetFormData {
  name: string;
  strategy: StrategyType;
  period: PeriodType;
  startAt: string;
  endAt: string;
}

export interface CategoryAllocation {
  categoryId: string;
  name: string;
  group: CategoryType;
  allocatedAmount: number;
}

export interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: PeriodType;
}

export type StepType =
  | "basic"
  | "income"
  | "cards"
  | "categories"
  | "allocation";

export interface Step {
  step: StepType;
  label: string;
  description: string;
}
