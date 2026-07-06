import type { Card, Category, RecurringTransaction } from "@prisma/client";
import type {
  CreateRecurringTransactionSchema,
  UpdateRecurringTransactionSchema,
} from "@/lib/api-schemas/recurring";

export type CreateRecurringTransactionRequest =
  CreateRecurringTransactionSchema;
export type UpdateRecurringTransactionRequest =
  UpdateRecurringTransactionSchema;

/** A recurring template as returned by GET /api/recurring, with its relations
 * and the computed preview fields the management UI renders. */
export type RecurringTransactionWithRelations = RecurringTransaction & {
  category:
    | (Category & {
        defaultCategoryId: string | null;
        defaultCategory?: Category | null;
      })
    | null;
  card: Card | null;
  /** Next up-to-3 occurrence dates from the current `nextRunAt`, for the
   * "upcoming" preview — doesn't mutate anything. */
  upcomingOccurrences: string[] | Date[];
  /** True when the template is overdue and no ACTIVE budget currently covers
   * its next occurrence date — surfaced as "needs a budget" in the UI. */
  needsBudget: boolean;
};
