import type { Budget, Category, Transaction, CategoryType, Card } from "@prisma/client";
import type { BudgetCategoryWithCategory } from "../data-hooks/budgets/useBudgetCategories";

export type SerializedBudget = Omit<
  Budget,
  "startAt" | "endAt" | "deleted" | "createdAt" | "updatedAt"
> & {
  // API responses serialize Date fields to ISO strings via JSON.stringify/NextResponse.json.
  startAt: string;
  endAt: string;
  deleted: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetWithRelations = SerializedBudget & {
  categories: (Category & {
    transactions: Transaction[];
  })[];
  transactions: Transaction[];
  cards?: (Card & {
    user: {
      id: string;
      name: string;
      firstName: string;
      lastName: string;
    };
  })[];
};

export type BudgetCategoryWithRelations = Category & {
  transactions: Transaction[];
};

export type CategoryTemplate = {
  id: string;
  name: string;
  group: CategoryType;
  createdAt: string;
  updatedAt: string;
};

export type CategoriesByGroup = Record<string, BudgetCategoryWithCategory[]>;

export type GroupColorFunction = (group: CategoryType) => string;
export type GroupLabelFunction = (group: CategoryType) => string; 