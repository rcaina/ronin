import type { Transaction, BudgetCategory, Budget, Category } from "@prisma/client";
import type { CreateTransactionSchema, UpdateTransactionSchema } from "@/lib/api-schemas/transactions";

// Re-export schema types for convenience
export type CreateTransactionData = CreateTransactionSchema;
export type UpdateTransactionData = UpdateTransactionSchema;

// Frontend-specific interfaces (with Date types for occurredAt)
export interface CreateTransactionRequest extends Omit<CreateTransactionSchema, 'occurredAt'> {
  occurredAt?: Date;
}

export interface UpdateTransactionRequest extends Omit<UpdateTransactionSchema, 'occurredAt'> {
  occurredAt?: Date;
}

// Transaction with relations type
export type TransactionWithRelations = Transaction & {
  category: BudgetCategory & {
    category: Category;
  } | null;
  Budget?: Budget;
}; 