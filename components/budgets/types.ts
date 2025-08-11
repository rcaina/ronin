import type { StrategyType, PeriodType, CategoryType } from "@prisma/client";

// Form data type
export interface CreateBudgetFormData {
  name: string;
  strategy: StrategyType;
  period: PeriodType;
  startAt: string;
  endAt: string;
  isRecurring: boolean;
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

export type StepType = "basic" | "income" | "categories" | "allocation";

export interface Step {
  step: StepType;
  label: string;
  description: string;
} 