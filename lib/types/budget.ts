import type { Budget, BudgetCategory, Income, Transaction } from "@prisma/client";

export type BudgetWithRelations = Budget & {
  categories: (BudgetCategory & {
    category: {
      id: string;
      name: string;
      group: string;
    };
    transactions: Transaction[];
  })[];
  incomes: Income[];
}; 