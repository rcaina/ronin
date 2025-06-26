import { type PrismaClient, type User, type PeriodType, type StrategyType } from "@prisma/client"

export interface CreateBudgetData {
  name: string
  strategy: StrategyType
  period: PeriodType
  startAt: string
  endAt: string
  isRecurring: boolean
  categoryAllocations?: Record<string, number>
  incomes: Array<{
    amount: number
    source: string
    description?: string
    isPlanned: boolean
    frequency: PeriodType
  }>
}

export interface UpdateBudgetData {
  name?: string
  strategy?: StrategyType
  period?: PeriodType
  startAt?: string
  endAt?: string
  isRecurring?: boolean
  categoryAllocations?: Record<string, number>
  income?: {
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
      isRecurring: data.isRecurring,
      accountId: user.accountId,
    },
  })

  // Create the income records
  for (const income of data.incomes) {
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
    })
  }

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

export async function updateBudget(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  data: UpdateBudgetData,
  user: User & { accountId: string }
) {
  // Update the budget
  const budget = await tx.budget.update({
    where: {
      id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      name: data.name,
      strategy: data.strategy,
      period: data.period,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      isRecurring: data.isRecurring,
    },
  })

  // Update income if provided
  if (data.income) {
    await tx.income.updateMany({
      where: {
        budgetId: id,
        accountId: user.accountId,
        deleted: null,
      },
      data: {
        amount: data.income.amount,
        source: data.income.source,
        description: data.income.description,
        isPlanned: data.income.isPlanned,
        frequency: data.income.frequency,
      },
    })
  }

  // Update budget category allocations if provided
  if (data.categoryAllocations) {
    // Delete existing allocations
    await tx.budgetCategory.updateMany({
      where: {
        budgetId: id,
        deleted: null,
      },
      data: {
        deleted: new Date(),
      },
    })

    // Create new allocations
    const budgetCategories = Object.entries(data.categoryAllocations).map(([categoryId, allocatedAmount]) => ({
      budgetId: id,
      categoryId,
      allocatedAmount,
    }))

    await tx.budgetCategory.createMany({
      data: budgetCategories,
    })
  }

  return budget
}

export async function deleteBudget(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  user: User & { accountId: string }
) {
  // Soft delete the budget
  await tx.budget.update({
    where: {
      id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  })

  // Soft delete related incomes
  await tx.income.updateMany({
    where: {
      budgetId: id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  })

  // Soft delete budget categories
  await tx.budgetCategory.updateMany({
    where: {
      budgetId: id,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  })

  return { success: true }
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
    orderBy: {
      createdAt: "desc",
    },
  })
} 