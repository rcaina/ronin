import type {
  Transaction,
  Budget,
  Category,
  TransactionSplit,
} from "@prisma/client";
import type {
  CreateTransactionSchema,
  UpdateTransactionSchema,
} from "@/lib/api-schemas/transactions";

// Re-export schema types for convenience
export type CreateTransactionData = CreateTransactionSchema;
export type UpdateTransactionData = UpdateTransactionSchema;

// Frontend-specific interfaces (with Date types for occurredAt)
export interface CreateTransactionRequest
  extends Omit<CreateTransactionSchema, "occurredAt"> {
  occurredAt?: Date;
}

export interface UpdateTransactionRequest
  extends Omit<UpdateTransactionSchema, "occurredAt"> {
  occurredAt?: Date;
}

// A transaction split line item with its category relation
export type TransactionSplitWithCategory = TransactionSplit & {
  category: Category & {
    defaultCategoryId: string | null;
    defaultCategory?: Category | null;
  };
};

// Transaction with relations type
export type TransactionWithRelations = Transaction & {
  category:
    | (Category & {
        defaultCategoryId: string | null;
        defaultCategory?: Category | null;
      })
    | null;
  Budget?: Budget;
  splits?: TransactionSplitWithCategory[];
};
