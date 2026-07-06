import { z } from "zod";
import { PeriodType, TransactionType } from "@prisma/client";

// A recurring template mirrors the fields on `createTransactionSchema`
// (see lib/api-schemas/transactions.ts) minus `budgetId` — recurring
// occurrences resolve their budget at post time from the occurrence date
// (see lib/utils/recurring.ts#findBudgetForOccurrence), not at creation time.
export const createRecurringTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number(),
  categoryId: z.string().optional(),
  cardId: z.string().optional(),
  transactionType: z
    .nativeEnum(TransactionType)
    .optional()
    .default(TransactionType.REGULAR),
  frequency: z.nativeEnum(PeriodType),
  // The first occurrence date. If it's due (<= now) once created, the lazy
  // catch-up / cron posts it on the next run.
  nextRunAt: z.string().min(1, "Start date is required"),
  endAt: z.string().optional(),
});

export const updateRecurringTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  categoryId: z.string().optional(),
  cardId: z.string().optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  frequency: z.nativeEnum(PeriodType).optional(),
  nextRunAt: z.string().optional(),
  endAt: z.string().nullable().optional(),
  paused: z.boolean().optional(),
});

export type CreateRecurringTransactionSchema = z.infer<
  typeof createRecurringTransactionSchema
>;
export type UpdateRecurringTransactionSchema = z.infer<
  typeof updateRecurringTransactionSchema
>;
