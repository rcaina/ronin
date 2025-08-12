import type { Budget, BudgetCategory, Income, Transaction, CategoryType } from "@prisma/client";
import type { BudgetCategoryWithCategory } from "../data-hooks/budgets/useBudgetCategories";

export type BudgetWithRelations = Budget & {
  categories: (BudgetCategory & {
    category: {
      id: string;
      name: string;
      group: CategoryType;
    };
    transactions: Transaction[];
  })[];
  incomes: Income[];
  transactions: Transaction[];
};

export type BudgetCategoryWithRelations = BudgetCategory & {
  category: {
    id: string;
    name: string;
    group: CategoryType;
  };
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