import { type PrismaClient, type User, type PeriodType, type StrategyType } from "@prisma/client"

export interface CreateBudgetData {
  name: string
  strategy: StrategyType
  period: PeriodType
  startAt: string
  endAt: string
  categoryAllocations?: Record<string, number>
  income: {
    amount: number
    source: string
    description?: string
    isPlanned: boolean
    frequency: PeriodType
  }
}

export async function createBudget(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateBudgetData,
  user: User & { accountId: string }
) {
  // Create the budget
  const budget = await tx.budget.create({
    data: {
      name: data.name,
      strategy: data.strategy,
      period: data.period,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      accountId: user.accountId,
    },
  })

  // Create the income record
  await tx.income.create({
    data: {
      accountId: user.accountId,
      userId: user.id,
      budgetId: budget.id,
      amount: data.income.amount,
      source: data.income.source,
      description: data.income.description,
      isPlanned: data.income.isPlanned,
      frequency: data.income.frequency,
      receivedAt: new Date(),
    },
  })

  // Create budget category allocations
  if (data.categoryAllocations) {
    const budgetCategories = Object.entries(data.categoryAllocations).map(([categoryId, allocatedAmount]) => ({
      budgetId: budget.id,
      categoryId,
      allocatedAmount,
    }))

    await tx.budgetCategory.createMany({
      data: budgetCategories,
    })
  }

  return budget
}

export async function getBudgets(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  accountId: string
) {
  return await tx.budget.findMany({
    where: {
      accountId,
      deleted: null,
    },
    include: {
      categories: true,
      incomes: true,
    },
  })
} 