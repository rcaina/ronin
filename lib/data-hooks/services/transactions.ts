import type { Transaction, Category, Budget } from "@prisma/client";

export type TransactionWithRelations = Transaction & {
  category: Category;
  budget?: Budget;
};

export const getTransactions = async (): Promise<TransactionWithRelations[]> => 
  fetch("/api/transactions").then((res) => res.json()) as Promise<TransactionWithRelations[]>; 