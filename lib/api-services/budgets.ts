import { type PrismaClient, type User, type BudgetStatus, type StrategyType, type PeriodType, type BudgetCategory, type Category, type Budget, TransactionType, type Transaction, CategoryType } from "@prisma/client"
import { HttpError } from "../errors"
import { formatBudget, formatBudgetCategories } from "../db/converter"
import type { PrismaClientTx } from "../prisma"
import type { UpdateBudgetCategoryData } from "../data-hooks/budgets/useBudgetCategories"
import prisma from "../prisma"
import { NextResponse } from "next/server"

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

export type BudgetCategories = (BudgetCategory & { 
  category: Category, 
  spentAmount: number,
  transactions?: undefined 
})[]

export async function getBudgetById(
  tx: PrismaClient,
  id: string,
  params: URLSearchParams
) {
  const excludeCardPayments = params.get('excludeCardPayments') === 'true';
  
  const budget = await tx.budget.findFirst({
    where: {
        id,
        deleted: null,
    },
    include: {
        categories: {
            where: {
                deleted: null,
            },
            include: {
                category: true,
                transactions: {
                    where: {
                        deleted: null,
                        ...(excludeCardPayments && {
                            transactionType: {
                                not: TransactionType.CARD_PAYMENT
                            }
                        }),
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        },
        incomes: {
            where: {
                deleted: null,
            },
        },
        transactions: {
            where: {
                deleted: null,
                categoryId: null, // Only transactions without categories (like card payments)
                ...(excludeCardPayments && {
                    transactionType: {
                        not: TransactionType.CARD_PAYMENT
                    }
                }),
            },
            include: {
                card: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        },
    },
});

if (!budget) {
    throw new HttpError("Budget not found", 404);
}

  return formatBudget(budget);
}

export async function createBudget(
  tx: PrismaClientTx,
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
  tx: PrismaClientTx,
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
  tx: PrismaClientTx,
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
  tx: PrismaClient,
  accountId: string,
  status?: BudgetStatus,
  excludeCardPayments?: boolean
): Promise<Budget[]> {
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
            where: {
              deleted: null,
              ...(excludeCardPayments && {
                transactionType: {
                  not: 'CARD_PAYMENT'
                }
              }),
            }
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
  tx: PrismaClientTx,
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
  tx: PrismaClientTx,
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
  tx: PrismaClientTx,
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
  tx: PrismaClientTx,
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


// Budget Categories

export const getBudgetCategories = async (
  tx: PrismaClientTx,
  budgetId: string,
): Promise<BudgetCategories> => {
  const budgetCategories = await tx.budgetCategory.findMany({
    where: {
      budgetId: budgetId,
      deleted: null,
    },
    include: {
      category: true,
      transactions: {
        where: {
          deleted: null,
        },
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  });

  return formatBudgetCategories(budgetCategories);
}

export const createBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  data: {
    categoryName: string;
    group: "needs" | "wants" | "investment";
    allocatedAmount: number;
  },
  user: User & { accountId: string }
): Promise<BudgetCategory & { category: Category }> => {
  // Verify the budget belongs to the user
  const budget = await tx.budget.findFirst({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
  });

  if (!budget) {
    throw new HttpError("Budget not found", 404);
  }

  // Convert group to CategoryType enum
  const groupToCategoryType = {
    needs: CategoryType.NEEDS,
    wants: CategoryType.WANTS,
    investment: CategoryType.INVESTMENT,
  };

  const categoryType = groupToCategoryType[data.group];

    // Create the category template first
    const category = await tx.category.create({
      data: {
        name: data.categoryName,
        group: categoryType,
      },
    });

    // Create the budget category
    const budgetCategory = await tx.budgetCategory.create({
      data: {
        budgetId: budgetId,
        categoryId: category.id,
        allocatedAmount: data.allocatedAmount,
      },
      include: {
        category: true,
      },
    });

    return budgetCategory;
}; 

export const updateBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  categoryId: string,
  data: UpdateBudgetCategoryData,
  user: User & { accountId: string }
): Promise<BudgetCategory & { category: Category }> => {
  // Verify the budget belongs to the user
  const budget = await tx.budget.findFirst({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
  });

  if (!budget) {
    throw new HttpError("Budget not found", 404);
  }

  // If updating categoryId, verify the new category exists
  if (data.categoryId) {
    const newCategory = await tx.category.findFirst({
      where: {
        id: data.categoryId,
        deleted: null,
      },
    });

    if (!newCategory) {
      throw new HttpError("Category not found", 404);
    }

    // Check if the new category is already added to this budget
    const existingBudgetCategory = await tx.budgetCategory.findFirst({
      where: {
        budgetId: budgetId,
        categoryId: data.categoryId,
        deleted: null,
      },
    });

    if (existingBudgetCategory) {
      throw new HttpError("Category is already added to this budget", 400);
    }
  }

  // Update the budget category
  const updateData: {
    allocatedAmount?: number;
    categoryId?: string;
  } = {};
  if (data.allocatedAmount !== undefined) {
    updateData.allocatedAmount = data.allocatedAmount;
  }
  if (data.categoryId) {
    updateData.categoryId = data.categoryId;
  }

  // If updating category name, update the associated category template
  if (data.categoryName) {
    const budgetCategory = await tx.budgetCategory.findFirst({
      where: {
        id: categoryId,
        budgetId: budgetId,
        deleted: null,
      },
      include: {
        category: true,
      },
    });

    if (!budgetCategory) {
      throw new HttpError("Budget category not found", 404);
    }

    // Update the category template name
      await tx.category.update({
      where: {
        id: budgetCategory.categoryId,
      },
      data: {
        name: data.categoryName,
      },
    });
  }

  const updatedBudgetCategory = await tx.budgetCategory.update({
    where: {
      id: categoryId,
      budgetId: budgetId,
      deleted: null,
    },
    data: updateData,
    include: {
      category: true,
    },
  });

  return updatedBudgetCategory;
};

export const deleteBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  categoryId: string,
  user: User & { accountId: string }
): Promise<BudgetCategory> => {
  // Verify the budget belongs to the user
  const budget = await tx.budget.findFirst({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
  });

  if (!budget) {
    throw new HttpError("Budget not found", 404);
  }

  // Check if there are any transactions in this category
  const transactions = await tx.transaction.findMany({
    where: {
      budgetId: budgetId,
      categoryId: categoryId,
      deleted: null,
    },
  });

  if (transactions.length > 0) {
    throw new HttpError("Cannot delete category with existing transactions", 400);
  }

  // Soft delete the budget category
  const budgetCategory = await tx.budgetCategory.update({
    where: {
      id: categoryId,
      budgetId: budgetId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });

  return budgetCategory;
}