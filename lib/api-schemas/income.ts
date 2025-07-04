import { PeriodType } from "@prisma/client";
import { z } from "zod";

export const updateIncomeSchema = z.object({
  incomes: z.array(
    z.object({
      id: z.string(),
      amount: z.number().positive("Income amount must be positive"),
      source: z.string().min(1, "Income source is required"),
      description: z.string().optional(),
      isPlanned: z.boolean(),
      frequency: z.enum([
        PeriodType.WEEKLY,
        PeriodType.MONTHLY,
        PeriodType.QUARTERLY,
        PeriodType.YEARLY,
        PeriodType.ONE_TIME,
      ]),
    })
  ).min(1, "At least one income is required"),
});

export const createIncomeSchema = z.object({
  amount: z.number().positive("Income amount must be positive"),
  source: z.string().min(1, "Income source is required"),
  description: z.string().optional(),
  isPlanned: z.boolean(),
  frequency: z.enum([
    PeriodType.WEEKLY,
    PeriodType.MONTHLY,
    PeriodType.QUARTERLY,
    PeriodType.YEARLY,
    PeriodType.ONE_TIME,
  ]),
});

export const updateSingleIncomeSchema = z.object({
  amount: z.number().positive("Income amount must be positive"),
  source: z.string().min(1, "Income source is required"),
  description: z.string().optional(),
  isPlanned: z.boolean(),
  frequency: z.enum([
    PeriodType.WEEKLY,
    PeriodType.MONTHLY,
    PeriodType.QUARTERLY,
    PeriodType.YEARLY,
    PeriodType.ONE_TIME,
  ]),
});

// Export inferred types for convenience
export type UpdateIncomeSchema = z.infer<typeof updateIncomeSchema>;
export type CreateIncomeSchema = z.infer<typeof createIncomeSchema>;
export type UpdateSingleIncomeSchema = z.infer<typeof updateSingleIncomeSchema>; 