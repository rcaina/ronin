import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { PeriodType, StrategyType, type User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required"),
  strategy: z.enum([StrategyType.ZERO_SUM, StrategyType.PERCENTAGE]),
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
  income: z.object({
    amount: z.coerce.number().positive("Income amount must be positive"),
    source: z.string().min(1, "Income source is required"),
    description: z.string().optional(),
    isPlanned: z.boolean(),
    frequency: z.enum([PeriodType.WEEKLY, PeriodType.MONTHLY, PeriodType.QUARTERLY, PeriodType.YEARLY, PeriodType.ONE_TIME]),
  }),
});

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const budgets = await prisma.budget.findMany({
            where: {
                accountId: user.accountId,
                deleted: null,
            },
            include: {
                categories: true,
                incomes: true,
            },
        })
  
        return NextResponse.json(budgets, { status: 200 })
    }),
})

export const POST = withUser({
    POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const body = await req.json() as unknown;
        console.log({body});
        const validationResult = createBudgetSchema.safeParse(body);
        
        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Validation failed", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { name, strategy, period, startAt, endAt, categoryAllocations, income } = validationResult.data;

        try {
            const result = await prisma.$transaction(async (tx) => {
                // Create the budget
                const budget = await tx.budget.create({
                    data: {
                        name,
                        strategy,
                        period,
                        startAt: new Date(startAt),
                        endAt: new Date(endAt),
                        accountId: user.accountId,
                    },
                });

                // Create the income record
                await tx.income.create({
                    data: {
                        accountId: user.accountId,
                        userId: user.id,
                        budgetId: budget.id,
                        amount: income.amount,
                        source: income.source,
                        description: income.description,
                        isPlanned: income.isPlanned,
                        frequency: income.frequency,
                        receivedAt: new Date(),
                    },
                });

                // Create budget category allocations
                const budgetCategories = Object.entries(categoryAllocations ?? {}).map(([categoryId, allocatedAmount]) => ({
                    budgetId: budget.id,
                    categoryId,
                    allocatedAmount,
                }));

                await tx.budgetCategory.createMany({
                    data: budgetCategories,
                });
                

                return budget;
            });

            return NextResponse.json(result, { status: 201 });
        } catch (error) {
            console.error("Error creating budget:", error);
            return NextResponse.json(
                { message: "Failed to create budget" },
                { status: 500 }
            );
        }
    }),
})