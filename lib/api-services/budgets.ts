import { type PrismaClient, type User, type BudgetStatus, type StrategyType, type PeriodType, type Category, type Budget, TransactionType, type CategoryType, type Transaction, type Card, CardType } from "@prisma/client"
import { HttpError } from "../errors"
import { formatBudget, formatBudgetCategories } from "../db/converter"
import type { PrismaClientTx } from "../prisma"
import type { UpdateBudgetCategoryData } from "../data-hooks/budgets/useBudgetCategories"
import type { z } from "zod"
import type { createBudgetSchema } from "../api-schemas/budgets"

export interface CreateBudgetData {
  name: string
  strategy: StrategyType
  period: PeriodType
  startAt: string
  endAt: string
  isRecurring: boolean
  categoryAllocations?: Array<{
    name: string
    group: CategoryType
    allocatedAmount: number
  }>
  incomes?: Array<{
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
  categoryAllocations?: Array<{
    name: string
    group: CategoryType
    allocatedAmount: number
  }>
}

export type BudgetCategories = (Category & { 
  spentAmount: number,
  transactions: Array<{
    id: string;
    name: string | null;
    description: string | null;
    amount: number;
    transactionType: TransactionType;
    createdAt: string;
  }>;
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
        cards: {
            where: {
                deleted: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        firstName: true,
                        lastName: true,
                    },
                },
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
  data: z.infer<typeof createBudgetSchema>,
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

  // Check if user already has any debit cards
  // Get all users in the same account
  const accountUsers = await tx.accountUser.findMany({
    where: {
      accountId: user.accountId,
    },
    select: {
      userId: true,
    },
  });

  const userIds = accountUsers.map(au => au.userId);

  const existingDebitCards = await tx.card.findFirst({
    where: {
      userId: {
        in: userIds,
      },
      cardType: {
        in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
      },
      deleted: null,
    },
  });

  // Create a default debit card named "Main" for the budget only if no debit cards exist
  let mainDebitCard;
  if (!existingDebitCards) {
    mainDebitCard = await tx.card.create({
      data: {
        name: "Main",
        cardType: CardType.DEBIT,
        userId: user.id,
        budgetId: budget.id,
        amountSpent: 0,
      },
    });
  } else {
    // Find or create the main debit card for this budget
    mainDebitCard = await tx.card.findFirst({
      where: {
        budgetId: budget.id,
        cardType: {
          in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
        },
        deleted: null,
      },
    });

    // If no debit card exists for this budget, create one
    mainDebitCard ??= await tx.card.create({
      data: {
        name: "Main",
        cardType: CardType.DEBIT,
        userId: user.id,
        budgetId: budget.id,
        amountSpent: 0,
      },
    });
  }

  // Create income transactions instead of income records
  if (mainDebitCard && data.incomes && data.incomes.length > 0) {
    for (const income of data.incomes) {
      await tx.transaction.create({
        data: {
          name: income.source,
          description: income.description,
          amount: income.amount, // Positive amount for income
          budgetId: budget.id,
          cardId: mainDebitCard.id,
          accountId: user.accountId,
          userId: user.id,
          transactionType: TransactionType.INCOME,
          categoryId: null, // Income transactions don't have categories
          occurredAt: new Date(),
        },
      });
    }
  }

  // Create budget category allocations
  if (data.categoryAllocations && data.categoryAllocations.length > 0) {
    // Fetch all default categories to match against
    const defaultCategories = await tx.category.findMany({
      where: {
        budgetId: null,
        defaultCategoryId: null,
        deleted: null,
      },
    });

    // Create a map of (name, group) -> defaultCategoryId for quick lookup
    const defaultCategoryMap = new Map<string, string>();
    defaultCategories.forEach((cat) => {
      const key = `${cat.name}|${cat.group}`;
      defaultCategoryMap.set(key, cat.id);
    });

    // Create categories with proper defaultCategoryId linking
    for (const { name, group, allocatedAmount } of data.categoryAllocations) {
      const key = `${name}|${group}`;
      const defaultCategoryId = defaultCategoryMap.get(key) ?? null;

      await tx.category.create({
        data: {
          budgetId: budget.id,
          name,
          group,
          allocatedAmount,
          defaultCategoryId,
        },
      });
    }
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

  // Update budget category allocations if provided
  if (data.categoryAllocations) {
    // Delete existing allocations
    await tx.category.updateMany({
      where: {
        budgetId: id,
        deleted: null,
      },
      data: {
        deleted: new Date(),
      },
    });

    // Create new allocations
    if (data.categoryAllocations.length > 0) {
      // Fetch all default categories to match against
      const defaultCategories = await tx.category.findMany({
        where: {
          budgetId: null,
          defaultCategoryId: null,
          deleted: null,
        },
      });

      // Create a map of (name, group) -> defaultCategoryId for quick lookup
      const defaultCategoryMap = new Map<string, string>();
      defaultCategories.forEach((cat) => {
        const key = `${cat.name}|${cat.group}`;
        defaultCategoryMap.set(key, cat.id);
      });

      // Create categories with proper defaultCategoryId linking
      for (const { name, group, allocatedAmount } of data.categoryAllocations) {
        const key = `${name}|${group}`;
        const defaultCategoryId = defaultCategoryMap.get(key) ?? null;

        await tx.category.create({
          data: {
            budgetId: id,
            name,
            group,
            allocatedAmount,
            defaultCategoryId,
          },
        });
      }
    }
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


  // Soft delete budget categories
  await tx.category.updateMany({
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

  // Sort completed and archived budgets by created date (descending - newest first)
  // Active budgets are also sorted by createdAt descending (newest first)
  const orderBy = status === 'COMPLETED' || status === 'ARCHIVED' 
    ? { createdAt: 'desc' as const }
    : { createdAt: 'desc' as const };

  return await tx.budget.findMany({
    where: whereClause,
    include: {
      categories: {
        where: { deleted: null },
        include: {
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
      transactions: {
        where: {
          deleted: null,
          categoryId: null,
          ...(excludeCardPayments && {
            transactionType: {
              not: 'CARD_PAYMENT'
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
      cards: {
        where: {
          deleted: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy,
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
      cards: {
        where: { deleted: null },
        select: {
          id: true,
          name: true,
          cardType: true,
          spendingLimit: true,
          userId: true,
        },
      },
      transactions: {
        where: { deleted: null },
        select: {
          id: true,
          name: true,
          description: true,
          amount: true,
          transactionType: true,
          cardId: true,
          occurredAt: true,
        },
      },
      categories: {
        where: { deleted: null },
        select: {
          name: true,
          group: true,
          allocatedAmount: true
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

  // Copy income transactions (INCOME type transactions on debit cards)
  const debitCards = originalBudget.cards?.filter(
    (card) => card.cardType === CardType.DEBIT || card.cardType === CardType.BUSINESS_DEBIT
  ) ?? [];
  const debitCardIds = debitCards.map((card) => card.id);
  
  if (debitCardIds.length > 0) {
    const incomeTransactions = originalBudget.transactions?.filter(
      (transaction) =>
        transaction.transactionType === TransactionType.INCOME &&
        transaction.cardId &&
        debitCardIds.includes(transaction.cardId)
    ) ?? [];

    // Find the main debit card in the new budget (should be created above)
    const newMainDebitCard = await tx.card.findFirst({
      where: {
        budgetId: newBudget.id,
        cardType: {
          in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
        },
        deleted: null,
      },
    });

    if (newMainDebitCard) {
      for (const transaction of incomeTransactions) {
        await tx.transaction.create({
          data: {
            name: transaction.name,
            description: transaction.description,
            amount: transaction.amount,
            budgetId: newBudget.id,
            cardId: newMainDebitCard.id,
            accountId: user.accountId,
            userId: user.id,
            transactionType: TransactionType.INCOME,
            categoryId: null,
            occurredAt: transaction.occurredAt ?? new Date(),
          },
        });
      }
    }
  }

  // Copy budget category allocations
  for (const category of originalBudget.categories) {
    await tx.category.create({
      data: {
        budgetId: newBudget.id,
        name: category.name,
        group: category.group,
        allocatedAmount: category.allocatedAmount,
      },
    });
  }

  // Copy cards from original budget to new budget
  for (const card of originalBudget.cards) {
    await tx.card.create({
      data: {
        ...card,
        budgetId: newBudget.id,
        amountSpent: 0
      },
    });
  }

  return newBudget;
}


// Budget Categories

export const getBudgetCategories = async (
  tx: PrismaClientTx,
  budgetId: string,
  searchQuery?: string,
): Promise<BudgetCategories> => {
  const categories = await tx.category.findMany({
    where: {
      budgetId: budgetId,
      deleted: null,
      ...(searchQuery?.trim() && {
        OR: [
          // Search in category name
          {
            name: {
              contains: searchQuery.trim(),
              mode: 'insensitive',
            },
          },
          // Search in allocated amount (exact match for numbers)
          ...(isNaN(Number(searchQuery)) ? [] : [{
            allocatedAmount: Number(searchQuery),
          }]),
          // Search in transactions
          {
            transactions: {
              some: {
                deleted: null,
                OR: [
                  // Search in transaction name
                  {
                    name: {
                      contains: searchQuery.trim(),
                      mode: 'insensitive',
                    },
                  },
                  // Search in transaction description
                  {
                    description: {
                      contains: searchQuery.trim(),
                      mode: 'insensitive',
                    },
                  },
                  // Search in transaction amount (exact match for numbers)
                  ...(isNaN(Number(searchQuery)) ? [] : [{
                    amount: Number(searchQuery),
                  }]),
                ],
              },
            },
          },
        ],
      }),
    },
    include: {
      transactions: {
        where: {
          deleted: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          amount: true,
          transactionType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const formattedCategories = formatBudgetCategories(categories);
  
  // Sort categories: incomplete first, completed last, then alphabetically within each group
  return formattedCategories.sort((a, b) => {
    const aIsCompleted = a.spentAmount >= (a.allocatedAmount ?? 0);
    const bIsCompleted = b.spentAmount >= (b.allocatedAmount ?? 0);
    
    // If completion status is different, incomplete comes first
    if (aIsCompleted !== bIsCompleted) {
      return aIsCompleted ? 1 : -1;
    }
    
    // If completion status is the same, sort alphabetically by category name
    return a.name.localeCompare(b.name);
  });
}

export const createBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  data: {
    categoryName: string;
    group: CategoryType;
    allocatedAmount: number;
  },
  user: User & { accountId: string }
): Promise<Category> => {
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

  // Find matching default category if it exists
  const defaultCategory = await tx.category.findFirst({
    where: {
      budgetId: null,
      defaultCategoryId: null,
      name: data.categoryName,
      group: data.group,
      deleted: null,
    },
  });

  // Create the category with proper defaultCategoryId linking
  const category = await tx.category.create({
    data: {
      budgetId: budgetId,
      name: data.categoryName,
      group: data.group,
      allocatedAmount: data.allocatedAmount,
      defaultCategoryId: defaultCategory?.id ?? null,
    },
  });

  return category;
}; 

export const updateBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  categoryId: string,
  data: UpdateBudgetCategoryData,
  user: User & { accountId: string }
): Promise<Category> => {
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

  // Verify the category exists and belongs to this budget
  const category = await tx.category.findFirst({
    where: {
      id: categoryId,
      budgetId: budgetId,
      deleted: null,
    },
  });

  if (!category) {
    throw new HttpError("Category not found", 404);
  }

  // Update the category directly
  const updateData: {
    allocatedAmount?: number;
    name?: string;
    group?: CategoryType;
  } = {};
  
  if (data.allocatedAmount !== undefined) {
    updateData.allocatedAmount = data.allocatedAmount;
  }
  if (data.name) {
    updateData.name = data.name;
  }
  if (data.group) {
    updateData.group = data.group;
  }

  const updatedCategory = await tx.category.update({
    where: {
      id: categoryId,
    },
    data: updateData,
  });

  return updatedCategory;
};

export const deleteBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  categoryId: string,
  user: User & { accountId: string }
): Promise<Category> => {
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

  // Soft delete the category
  const category = await tx.category.update({
    where: {
      id: categoryId,
      budgetId: budgetId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });

  return category;
};

export const getBudgetTransactions = async (
  tx: PrismaClient,
  budgetId: string,
): Promise<(Transaction & { category: Category | null, Budget: Budget })[]> => {
  return await tx.transaction.findMany({
    where: { budgetId: budgetId, deleted: null },
    include: {
      category: true,
      Budget: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getBudgetCards = async (
  tx: PrismaClient,
  budgetId: string,
): Promise<Card[]> => {
  const cards = await tx.card.findMany({
    where: {
      budgetId: budgetId,
      deleted: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
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
    orderBy: { createdAt: "desc" },
  });

  // Calculate amountSpent for each card by summing related transactions
  const cardsWithAmountSpent = cards.map(card => {
    const isCreditCard = card.cardType === CardType.CREDIT || card.cardType === CardType.BUSINESS_CREDIT;
    const isDebitCard = card.cardType === CardType.DEBIT || card.cardType === CardType.BUSINESS_DEBIT;
    
    let amountSpent = 0;
    if (isCreditCard) {
      // For credit cards: handle regular transactions and card payments differently
      amountSpent = card.transactions.reduce((sum, transaction) => {
        if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
          // Card payments reduce the balance (positive amount = payment received)
          return sum - transaction.amount; // Subtract payment amount (reduces balance)
        } else if (transaction.transactionType === TransactionType.RETURN) {
          // Returns reduce the balance (positive amount = refund received)
          return sum - transaction.amount; // Subtract return amount (reduces balance)
        } else {
          // Regular transactions: positive = purchases (increase balance)
          return sum + transaction.amount;
        }
      }, 0);
    } else {
      // For debit/cash cards: exclude income, handle returns and regular transactions
      amountSpent = card.transactions.reduce((sum, transaction) => {
        // Exclude income transactions from amount spent
        if (transaction.transactionType === TransactionType.INCOME) {
          return sum; // Don't count income in amount spent
        } else if (transaction.transactionType === TransactionType.RETURN) {
          // Returns reduce spending (positive amount = refund received)
          return sum - transaction.amount; // Subtract return amount (reduces spending)
        } else {
          // Regular transactions: positive = purchases (increase spending)
          return sum + transaction.amount;
        }
      }, 0);
    }
    
    // For debit cards, calculate spendingLimit from INCOME transactions on this card
    // This matches the income page calculation but per-card
    let spendingLimit = card.spendingLimit;
    if (isDebitCard) {
      const cardIncome = card.transactions.reduce((sum, transaction) => {
        if (transaction.transactionType === TransactionType.INCOME) {
          return sum + transaction.amount;
        }
        return sum;
      }, 0);
      spendingLimit = cardIncome > 0 ? cardIncome : null;
    }
    
    return {
      ...card,
      amountSpent,
      spendingLimit,
      transactions: undefined, // Remove transactions from response
    };
  });

  return cardsWithAmountSpent;
}

export const getBudgetIncomeTransactions = async (
  tx: PrismaClient,
  budgetId: string,
): Promise<Transaction[]> => {
  // Get all debit cards for this budget
  const debitCards = await tx.card.findMany({
    where: {
      budgetId: budgetId,
      cardType: {
        in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
      },
      deleted: null,
    },
    select: {
      id: true,
    },
  });

  const cardIds = debitCards.map((card) => card.id);

  if (cardIds.length === 0) {
    return [];
  }

  // Get all INCOME transactions on these debit cards
  const transactions = await tx.transaction.findMany({
    where: {
      budgetId: budgetId,
      cardId: {
        in: cardIds,
      },
      transactionType: TransactionType.INCOME,
      deleted: null,
    },
    include: {
      card: {
        select: {
          id: true,
          name: true,
          cardType: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return transactions;
};

export const calculateBudgetIncome = async (
  tx: PrismaClient,
  budgetId: string,
): Promise<number> => {
  const debitCards = await tx.card.findMany({
    where: {
      budgetId: budgetId,
      cardType: {
        in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
      },
      deleted: null,
    },
    select: {
      id: true,
    },
  });

  const cardIds = debitCards.map((card) => card.id);

  if (cardIds.length === 0) {
    return 0;
  }

  const incomeTransactions = await tx.transaction.findMany({
    where: {
      budgetId: budgetId,
      cardId: {
        in: cardIds,
      },
      transactionType: TransactionType.INCOME,
      deleted: null,
    },
    select: {
      amount: true,
    },
  });

  return incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
};
    
    