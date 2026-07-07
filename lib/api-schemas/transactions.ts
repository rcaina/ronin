import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { roundToCents } from "@/lib/utils";

// Schema for a single split leg of a transaction (one category's share of the
// total transaction amount).
export const transactionSplitInputSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export type TransactionSplitInput = z.infer<typeof transactionSplitInputSchema>;

// Split legs must sum to the transaction's total amount, within a
// sub-cent floating point tolerance (mirrors lib/utils/receipt.ts).
function splitsSumMatchesAmount(
  splits: TransactionSplitInput[],
  amount: number,
): boolean {
  const sum = roundToCents(
    splits.reduce((total, split) => total + split.amount, 0),
  );
  return Math.abs(sum - roundToCents(amount)) < 0.005;
}

// Zod schemas for API validation
const createTransactionBaseSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number(), // Allow any number (positive, negative, or zero)
  budgetId: z.string().min(1, "Budget is required"),
  categoryId: z.string().optional(), // Optional for card payments
  cardId: z.string().optional(),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
  transactionType: z
    .nativeEnum(TransactionType)
    .optional()
    .default(TransactionType.REGULAR),
  splits: z.array(transactionSplitInputSchema).min(2).optional(),
});

export const createTransactionSchema = createTransactionBaseSchema.superRefine(
  (data, ctx) => {
    if (!data.splits) {
      return;
    }

    if (data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "categoryId must not be set when splits are provided",
      });
    }

    if (
      data.transactionType !== TransactionType.REGULAR &&
      data.transactionType !== TransactionType.RETURN
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transactionType"],
        message: "Splits are only supported for REGULAR or RETURN transactions",
      });
    }

    if (!splitsSumMatchesAmount(data.splits, data.amount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["splits"],
        message: "Split amounts must sum to the transaction amount",
      });
    }
  },
);

// Schema for card payment transactions
export const createCardPaymentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive("Payment amount must be positive"),
  budgetId: z.string().min(1, "Budget is required"),
  fromCardId: z.string().min(1, "Source card is required"),
  toCardId: z.string().min(1, "Destination card is required"),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
});

// Schema for creating several transactions atomically (e.g. a receipt split
// across multiple categories).
export const createTransactionsBatchSchema = z.object({
  transactions: z
    .array(createTransactionSchema)
    .min(1, "At least one transaction is required"),
});

const updateTransactionBaseSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(), // Allow any number (positive, negative, or zero)
  budgetId: z.string().min(1, "Budget is required").optional(),
  categoryId: z.string().optional(), // Optional for card payments
  cardId: z.string().optional(),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  splits: z.array(transactionSplitInputSchema).min(2).optional(),
});

export const updateTransactionSchema = updateTransactionBaseSchema.superRefine(
  (data, ctx) => {
    if (!data.splits) {
      return;
    }

    if (data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "categoryId must not be set when splits are provided",
      });
    }

    // When amount is omitted here, the service layer validates the split sum
    // against the stored transaction amount (see Phase 2).
    if (
      data.amount !== undefined &&
      !splitsSumMatchesAmount(data.splits, data.amount)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["splits"],
        message: "Split amounts must sum to the transaction amount",
      });
    }
  },
);

// Export inferred types for convenience
export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionSchema = z.infer<typeof updateTransactionSchema>;
export type CreateCardPaymentSchema = z.infer<typeof createCardPaymentSchema>;
export type CreateTransactionsBatchSchema = z.infer<
  typeof createTransactionsBatchSchema
>;

// A single mapped CSV row sent to the import endpoint. All values arrive as
// raw strings; parsing/validation happens server-side via
// `lib/utils/transaction-import.ts` (mirrored client-side for the preview).
export const importTransactionRowSchema = z.object({
  date: z.string().default(""),
  name: z.string().default(""),
  amount: z.string().default(""),
  category: z.string().default(""),
  card: z.string().default(""),
  type: z.string().default(""),
});

// CSV import request: which budget the rows post into, the mapped rows, and
// whether to actually persist (`commit`) or just return a validated preview.
export const importTransactionsSchema = z.object({
  budgetId: z.string().min(1, "Budget is required"),
  rows: z
    .array(importTransactionRowSchema)
    .min(1, "At least one row is required"),
  commit: z.boolean().default(false),
});

export type ImportTransactionRowSchema = z.infer<
  typeof importTransactionRowSchema
>;
export type ImportTransactionsSchema = z.infer<typeof importTransactionsSchema>;
