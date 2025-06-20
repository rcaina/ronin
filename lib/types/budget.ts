import type { Budget, Category, Transaction } from "@prisma/client";

export type BudgetWithRelations = Budget & {
  categories: (Category & {
    transactions: Transaction[];
  })[];
}; 