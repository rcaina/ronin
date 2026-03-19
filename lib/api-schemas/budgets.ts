import { PeriodType, StrategyType, CategoryType, CardType } from "@prisma/client"
import { z } from "zod"
import { calculateEndDate } from "@/lib/utils"

const parseBudgetDate = (value: string): Date | null => {
  const datePart = value.includes("T") ? (value.split("T")[0] ?? "") : value
  const [year, month, day] = datePart.split("-").map(Number)

  if (!year || !month || !day || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null
  }

  return new Date(year, month - 1, day)
}

const budgetDateInvariantRefine = (
  data: { startAt: string; endAt: string; period: PeriodType },
  ctx: z.RefinementCtx,
) => {
  const startDate = parseBudgetDate(data.startAt)
  const endDate = parseBudgetDate(data.endAt)

  if (!startDate || !endDate) {
    return
  }

  if (endDate < startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endAt"],
      message: "End date must be on or after start date",
    })
    return
  }

  if (data.period === PeriodType.ONE_TIME) {
    return
  }

  const calculatedEndDate = calculateEndDate(startDate, data.period)
  const diffTime = Math.abs(calculatedEndDate.getTime() - endDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endAt"],
      message: "End date should match the selected period",
    })
  }
}

const createBudgetBaseSchema = z.object({
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
  categoryAllocations: z.array(z.object({
    name: z.string().min(1, "Category name is required"),
    group: z.nativeEnum(CategoryType),
    allocatedAmount: z.coerce.number().min(0, "Allocated amount must be non-negative"),
  })).optional(),
  shouldCreateDefaultDebitCard: z.boolean().optional(),
  incomes: z
    .array(
      z.object({
        amount: z.coerce.number().positive("Income amount must be positive"),
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
      }),
    )
    .min(1, "At least one income is required")
    .optional(),
})

export const createBudgetSchema = createBudgetBaseSchema.superRefine(budgetDateInvariantRefine)

const cardToIncludeSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.coerce.number().optional(),
  userId: z.string().min(1, "User id is required"),
})

// Budget + cards + incomes in a single call. Cards are created first;
// if any card creation/copy fails, income creation is skipped.
export const createBudgetWithCardsSchema = z.object({
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
  categoryAllocations: z.array(z.object({
    name: z.string().min(1, "Category name is required"),
    group: z.nativeEnum(CategoryType),
    allocatedAmount: z.coerce.number().min(0, "Allocated amount must be non-negative"),
  })).optional(),
  incomes: z
    .array(
      z.object({
        amount: z.coerce.number().positive("Income amount must be positive"),
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
      }),
    )
    .min(1, "At least one income is required")
    .optional(),
  cardsToInclude: z.array(cardToIncludeSchema).optional(),
}).superRefine(budgetDateInvariantRefine)

export const updateBudgetSchema = createBudgetBaseSchema.partial()

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema> 

export type CreateBudgetWithCardsSchema = z.infer<typeof createBudgetWithCardsSchema>
