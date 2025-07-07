import type { Budget, BudgetCategory, Income, Transaction, CategoryType } from "@prisma/client";

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

export type CategoriesByGroup = Record<string, BudgetCategoryWithRelations[]>;

export type GroupColorFunction = (group: string) => string;
export type GroupLabelFunction = (group: string) => string; 