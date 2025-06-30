import { PeriodType, StrategyType } from "@prisma/client"
import { z } from "zod"

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required"),
  strategy: z.enum([StrategyType.ZERO_SUM, StrategyType.FIFTY_THIRTY_TWENTY]),
  isRecurring: z.boolean(),
  period: z.enum([PeriodType.WEEKLY, PeriodType.MONTHLY, PeriodType.QUARTERLY, PeriodType.YEARLY, PeriodType.ONE_TIME]),
  startAt: z.string()
    .transform((val) => {
      // Handle date-only strings like '2025-06-20'
      if (/^\d{4}-\d{2}-\d{2}$/.exec(val)) {
        return `${val}T00:00:00.000Z`;
      }
      return val;
    })
    .pipe(z.string().datetime("Invalid start date format")),
  endAt: z.string()
    .transform((val) => {
      // Handle date-only strings like '2025-06-20'
      if (/^\d{4}-\d{2}-\d{2}$/.exec(val)) {
        return `${val}T00:00:00.000Z`;
      }
      return val;
    })
    .pipe(z.string().datetime("Invalid end date format")),
  categoryAllocations: z.record(z.string(), z.coerce.number()).optional(),
  incomes: z.array(z.object({
    amount: z.coerce.number().positive("Income amount must be positive"),
    source: z.string().min(1, "Income source is required"),
    description: z.string().optional(),
    isPlanned: z.boolean(),
    frequency: z.enum([PeriodType.WEEKLY, PeriodType.MONTHLY, PeriodType.QUARTERLY, PeriodType.YEARLY, PeriodType.ONE_TIME]),
  })).min(1, "At least one income is required"),
})

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema> 