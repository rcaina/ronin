import { type PrismaClient, type User, type BudgetStatus, type StrategyType, type PeriodType, type BudgetCategory, type Category } from "@prisma/client"

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
  accountId: string,
  status?: BudgetStatus
) {
  const whereClause = {
    accountId,
    deleted: null,
    ...(status && { status }),
  };

  return await tx.budget.findMany({
    where: whereClause,
    include: {
      categories: {
        where: { deleted: null },
        include: {
          category: true,
          transactions: {
            where: { deleted: null }
          }
        }
      },
      incomes: {
        where: { deleted: null }
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function markBudgetCompleted(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  budgetId: string,
  user: User & { accountId: string }
) {
  return await tx.budget.update({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      status: 'COMPLETED' as BudgetStatus,
    },
  })
}

export async function markBudgetArchived(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  budgetId: string,
  user: User & { accountId: string }
) {
  return await tx.budget.update({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      status: 'ARCHIVED' as BudgetStatus,
    },
  })
}

export async function reactivateBudget(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  budgetId: string,
  user: User & { accountId: string }
) {
  return await tx.budget.update({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      status: 'ACTIVE' as BudgetStatus,
    },
  })
}

export async function duplicateBudget(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  budgetId: string,
  user: User & { accountId: string }
) {
  // Get the original budget with all relations
  const originalBudget = await tx.budget.findFirst({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    include: {
      incomes: {
        where: { deleted: null }
      },
      categories: {
        where: { deleted: null },
        include: {
          category: true
        }
      }
    }
  });

  if (!originalBudget) {
    throw new Error("Budget not found");
  }

  // Create new budget with copied data
  const newBudget = await tx.budget.create({
    data: {
      name: `${originalBudget.name} (Copy)`,
      strategy: originalBudget.strategy,
      period: originalBudget.period,
      startAt: new Date(),
      endAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      isRecurring: originalBudget.isRecurring,
      accountId: user.accountId,
    },
  });

  // Copy income records
  for (const income of originalBudget.incomes) {
    await tx.income.create({
      data: {
        accountId: user.accountId,
        userId: user.id,
        budgetId: newBudget.id,
        amount: income.amount,
        source: income.source,
        description: income.description,
        isPlanned: income.isPlanned,
        frequency: income.frequency,
        receivedAt: new Date(),
      },
    });
  }

  // Copy budget category allocations
  for (const budgetCategory of originalBudget.categories) {
    await tx.budgetCategory.create({
      data: {
        budgetId: newBudget.id,
        categoryId: budgetCategory.categoryId,
        allocatedAmount: budgetCategory.allocatedAmount,
      },
    });
  }

  return newBudget;
}

export const createBudgetCategory = async (
  budgetId: string,
  data: {
    categoryName: string;
    group: "needs" | "wants" | "investment";
    allocatedAmount: number;
  }
): Promise<BudgetCategory & { category: Category }> => {
  const response = await fetch(`/api/budgets/${budgetId}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message ?? "Failed to create budget category");
  }

  const result = await response.json() as { budgetCategory: BudgetCategory & { category: Category } };
  return result.budgetCategory;
}; 