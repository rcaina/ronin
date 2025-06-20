import type { Budget, Category, Income, Transaction } from "@prisma/client";

export type BudgetWithRelations = Budget & {
  categories: (Category & {
    transactions: Transaction[];
  })[];
  incomes: Income[];
}; 