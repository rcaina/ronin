import {
  type PrismaClient,
  type User,
  type BudgetStatus,
  type Category,
  type Budget,
  TransactionType,
  type CategoryType,
  type Transaction,
  type Card,
  CardType,
} from "@prisma/client";
import { HttpError } from "../errors";
import { formatBudget, formatBudgetCategories } from "../db/converter";
import type { PrismaClientTx } from "../prisma";
import type { z } from "zod";
import type {
  createBudgetSchema,
  createBudgetWithCardsSchema,
} from "../api-schemas/budgets";
import { createCard as createCardService } from "./cards";
import { calculateCardFinancials } from "./card-financials";
import type {
  UpdateBudgetData,
  BudgetCategories,
  UpdateBudgetCategoryData,
} from "../types/budget";

export async function getBudgetById(
  tx: PrismaClient,
  id: string,
  params: URLSearchParams,
) {
  const excludeCardPayments = params.get("excludeCardPayments") === "true";

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
                  not: TransactionType.CARD_PAYMENT,
                },
              }),
            },
            orderBy: {
              createdAt: "desc",
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
              not: TransactionType.CARD_PAYMENT,
            },
          }),
        },
        include: {
          card: true,
        },
        orderBy: {
          createdAt: "desc",
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
  user: User & { accountId: string },
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
  });

  const shouldCreateDefaultDebitCard =
    data.shouldCreateDefaultDebitCard ?? true;

  // Used to attach "income" transactions to a card at budget-creation time.
  // If we're skipping default debit-card creation, these transactions may be created with no cardId.
  let mainDebitCard: Card | null = null;

  if (shouldCreateDefaultDebitCard) {
    // Ensure this budget has a default debit card named "Main".
    // (If cards were already created for this budget elsewhere, reuse them.)
    mainDebitCard = await tx.card.findFirst({
      where: {
        budgetId: budget.id,
        cardType: {
          in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
        },
        deleted: null,
      },
    });

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

  // Create income transactions only when we can link them to a debit card.
  // When `shouldCreateDefaultDebitCard` is false, the client creates cards first
  // and then creates INCOME transactions once the debit card id is available.
  if (mainDebitCard?.id && data.incomes && data.incomes.length > 0) {
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

  return budget;
}

async function createBudgetWithCardsAndIncomes(
  tx: PrismaClientTx,
  data: z.infer<typeof createBudgetWithCardsSchema>,
  user: User & { accountId: string },
) {
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
  });

  const failedCards: string[] = [];
  const createdCards: Card[] = [];

  // Create cards first (best effort). If any card fails, we skip income creation.
  const cardsToInclude = data.cardsToInclude ?? [];
  for (const card of cardsToInclude) {
    try {
      const createdCard = await createCardService(
        tx,
        { ...card, budgetId: budget.id },
        user,
      );
      createdCards.push(createdCard);
    } catch {
      failedCards.push(card.name);
    }
  }

  // Ensure we have a debit card to attach incomes to.
  const debitCards = createdCards.filter(
    (c) =>
      c.cardType === CardType.DEBIT || c.cardType === CardType.BUSINESS_DEBIT,
  );
  let debitCardToUse =
    debitCards.find((c) => c.name === "Main") ?? debitCards[0] ?? null;

  if (!debitCardToUse) {
    try {
      const defaultDebitCard = await createCardService(
        tx,
        {
          name: "Main",
          cardType: CardType.DEBIT,
          userId: user.id,
          budgetId: budget.id,
        },
        user,
      );
      createdCards.push(defaultDebitCard);
      debitCardToUse = defaultDebitCard;
    } catch {
      failedCards.push("Main");
      debitCardToUse = null;
    }
  }

  // Create budget category allocations
  if (data.categoryAllocations && data.categoryAllocations.length > 0) {
    // Fetch all default categories to match against (same behavior as `createBudget`)
    const defaultCategories = await tx.category.findMany({
      where: {
        budgetId: null,
        defaultCategoryId: null,
        deleted: null,
      },
    });

    const defaultCategoryMap = new Map<string, string>();
    defaultCategories.forEach((cat) => {
      const key = `${cat.name}|${cat.group}`;
      defaultCategoryMap.set(key, cat.id);
    });

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

  const failedIncomes: string[] = [];

  // Requirement: if any card creation/copy fails, incomes should not be created.
  const incomesToCreate = data.incomes ?? [];
  const debitCardId = debitCardToUse?.id;
  const shouldCreateIncomes =
    failedCards.length === 0 && debitCardId && incomesToCreate.length > 0;

  if (shouldCreateIncomes) {
    for (const income of incomesToCreate) {
      try {
        await tx.transaction.create({
          data: {
            name: income.source,
            description: income.description,
            amount: income.amount, // Positive amount for income
            budgetId: budget.id,
            cardId: debitCardId,
            accountId: user.accountId,
            userId: user.id,
            transactionType: TransactionType.INCOME,
            categoryId: null, // Income transactions don't have categories
            occurredAt: new Date(),
          },
        });
      } catch {
        failedIncomes.push(income.source);
      }
    }
  }

  return {
    message: "Budget created successfully",
    budget,
    failedCards,
    failedIncomes,
    incomesSkipped: failedCards.length > 0,
  };
}

export async function createBudgetFromScratchWithCards(
  tx: PrismaClientTx,
  data: z.infer<typeof createBudgetWithCardsSchema>,
  user: User & { accountId: string },
) {
  return createBudgetWithCardsAndIncomes(tx, data, user);
}

export async function duplicateBudgetWithCards(
  tx: PrismaClientTx,
  data: z.infer<typeof createBudgetWithCardsSchema>,
  user: User & { accountId: string },
) {
  return createBudgetWithCardsAndIncomes(tx, data, user);
}

export async function updateBudget(
  tx: PrismaClientTx,
  id: string,
  data: UpdateBudgetData,
  user: User & { accountId: string },
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
  });

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

  return budget;
}

export async function deleteBudget(
  tx: PrismaClientTx,
  id: string,
  user: User & { accountId: string },
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
  });

  // Soft delete budget categories
  await tx.category.updateMany({
    where: {
      budgetId: id,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });

  return { success: true };
}

export async function getBudgets(
  tx: PrismaClient,
  accountId: string,
  status?: BudgetStatus,
  excludeCardPayments?: boolean,
): Promise<Budget[]> {
  const whereClause = {
    accountId,
    deleted: null,
    ...(status && { status }),
  };

  // Sort completed and archived budgets by created date (descending - newest first)
  // Active budgets are also sorted by createdAt descending (newest first)
  const orderBy =
    status === "COMPLETED" || status === "ARCHIVED"
      ? { createdAt: "desc" as const }
      : { createdAt: "desc" as const };

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
                  not: "CARD_PAYMENT",
                },
              }),
            },
          },
        },
      },
      transactions: {
        where: {
          deleted: null,
          categoryId: null,
          ...(excludeCardPayments && {
            transactionType: {
              not: "CARD_PAYMENT",
            },
          }),
        },
        include: {
          card: true,
        },
        orderBy: {
          createdAt: "desc",
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
  });
}

export async function markBudgetCompleted(
  tx: PrismaClientTx,
  budgetId: string,
  user: User & { accountId: string },
) {
  return await tx.budget.update({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      status: "COMPLETED" as BudgetStatus,
    },
  });
}

export async function markBudgetArchived(
  tx: PrismaClientTx,
  budgetId: string,
  user: User & { accountId: string },
) {
  return await tx.budget.update({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      status: "ARCHIVED" as BudgetStatus,
    },
  });
}

export async function reactivateBudget(
  tx: PrismaClientTx,
  budgetId: string,
  user: User & { accountId: string },
) {
  return await tx.budget.update({
    where: {
      id: budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      status: "ACTIVE" as BudgetStatus,
    },
  });
}

export async function duplicateBudget(
  tx: PrismaClientTx,
  budgetId: string,
  user: User & { accountId: string },
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
          allocatedAmount: true,
        },
      },
    },
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
  const debitCards =
    originalBudget.cards?.filter(
      (card) =>
        card.cardType === CardType.DEBIT ||
        card.cardType === CardType.BUSINESS_DEBIT,
    ) ?? [];
  const debitCardIds = debitCards.map((card) => card.id);

  if (debitCardIds.length > 0) {
    const incomeTransactions =
      originalBudget.transactions?.filter(
        (transaction) =>
          transaction.transactionType === TransactionType.INCOME &&
          transaction.cardId &&
          debitCardIds.includes(transaction.cardId),
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
        amountSpent: 0,
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
              mode: "insensitive",
            },
          },
          // Search in allocated amount (exact match for numbers)
          ...(isNaN(Number(searchQuery))
            ? []
            : [
                {
                  allocatedAmount: Number(searchQuery),
                },
              ]),
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
                      mode: "insensitive",
                    },
                  },
                  // Search in transaction description
                  {
                    description: {
                      contains: searchQuery.trim(),
                      mode: "insensitive",
                    },
                  },
                  // Search in transaction amount (exact match for numbers)
                  ...(isNaN(Number(searchQuery))
                    ? []
                    : [
                        {
                          amount: Number(searchQuery),
                        },
                      ]),
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
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      name: "asc",
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
};

export const createBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  data: {
    categoryName: string;
    group: CategoryType;
    allocatedAmount: number;
  },
  user: User & { accountId: string },
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

// Copy selected categories (name, group, allocatedAmount) from one budget into
// another. Both budgets must belong to the user's account. Categories whose
// name+group already exist on the target are skipped so importing is idempotent.
export const importBudgetCategories = async (
  tx: PrismaClientTx,
  targetBudgetId: string,
  sourceBudgetId: string,
  categoryIds: string[],
  user: User & { accountId: string },
): Promise<{ created: Category[]; skipped: number }> => {
  const [targetBudget, sourceBudget] = await Promise.all([
    tx.budget.findFirst({
      where: { id: targetBudgetId, accountId: user.accountId, deleted: null },
    }),
    tx.budget.findFirst({
      where: { id: sourceBudgetId, accountId: user.accountId, deleted: null },
    }),
  ]);

  if (!targetBudget) {
    throw new HttpError("Budget not found", 404);
  }
  if (!sourceBudget) {
    throw new HttpError("Source budget not found", 404);
  }

  const sourceCategories = await tx.category.findMany({
    where: {
      id: { in: categoryIds },
      budgetId: sourceBudgetId,
      deleted: null,
    },
  });

  // Dedupe against categories already on the target budget (by group + name).
  const existingCategories = await tx.category.findMany({
    where: { budgetId: targetBudgetId, deleted: null },
    select: { name: true, group: true },
  });
  const keyOf = (group: CategoryType, name: string) =>
    `${group}:${name.toLowerCase()}`;
  const existingKeys = new Set(
    existingCategories.map((c) => keyOf(c.group, c.name)),
  );

  // Default category templates, for linking copied categories to their template.
  const defaultCategories = await tx.category.findMany({
    where: { budgetId: null, defaultCategoryId: null, deleted: null },
    select: { id: true, name: true, group: true },
  });
  const defaultIdByKey = new Map(
    defaultCategories.map((c) => [keyOf(c.group, c.name), c.id]),
  );

  const created: Category[] = [];
  let skipped = 0;

  for (const sourceCategory of sourceCategories) {
    const key = keyOf(sourceCategory.group, sourceCategory.name);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const category = await tx.category.create({
      data: {
        budgetId: targetBudgetId,
        name: sourceCategory.name,
        group: sourceCategory.group,
        allocatedAmount: sourceCategory.allocatedAmount ?? 0,
        defaultCategoryId: defaultIdByKey.get(key) ?? null,
      },
    });
    created.push(category);
    existingKeys.add(key);
  }

  return { created, skipped };
};

// Copy selected cards from one budget into another. Both budgets must belong to
// the user's account. Cards that already exist on the target (same owner, type,
// name and last four digits) are skipped so importing is idempotent. Spent
// amounts are not copied — they are derived from transactions.
export const importBudgetCards = async (
  tx: PrismaClientTx,
  targetBudgetId: string,
  sourceBudgetId: string,
  cardIds: string[],
  user: User & { accountId: string },
): Promise<{ created: Card[]; skipped: number }> => {
  const [targetBudget, sourceBudget] = await Promise.all([
    tx.budget.findFirst({
      where: { id: targetBudgetId, accountId: user.accountId, deleted: null },
    }),
    tx.budget.findFirst({
      where: { id: sourceBudgetId, accountId: user.accountId, deleted: null },
    }),
  ]);

  if (!targetBudget) {
    throw new HttpError("Budget not found", 404);
  }
  if (!sourceBudget) {
    throw new HttpError("Source budget not found", 404);
  }

  const sourceCards = await tx.card.findMany({
    where: {
      id: { in: cardIds },
      budgetId: sourceBudgetId,
      deleted: null,
    },
  });

  const existingCards = await tx.card.findMany({
    where: { budgetId: targetBudgetId, deleted: null },
    select: { name: true, cardType: true, userId: true, lastFourDigits: true },
  });
  const keyOf = (c: {
    userId: string;
    cardType: CardType;
    name: string;
    lastFourDigits: string | null;
  }) =>
    `${c.userId}:${c.cardType}:${c.name.toLowerCase()}:${c.lastFourDigits ?? ""}`;
  const existingKeys = new Set(existingCards.map(keyOf));

  const created: Card[] = [];
  let skipped = 0;

  for (const sourceCard of sourceCards) {
    const key = keyOf(sourceCard);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const card = await tx.card.create({
      data: {
        name: sourceCard.name,
        lastFourDigits: sourceCard.lastFourDigits?.length
          ? sourceCard.lastFourDigits
          : null,
        cardType: sourceCard.cardType,
        spendingLimit: sourceCard.spendingLimit,
        userId: sourceCard.userId,
        budgetId: targetBudgetId,
      },
    });
    created.push(card);
    existingKeys.add(key);
  }

  return { created, skipped };
};

export const updateBudgetCategory = async (
  tx: PrismaClientTx,
  budgetId: string,
  categoryId: string,
  data: UpdateBudgetCategoryData,
  user: User & { accountId: string },
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
  user: User & { accountId: string },
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
    throw new HttpError(
      "Cannot delete category with existing transactions",
      400,
    );
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
): Promise<(Transaction & { category: Category | null; Budget: Budget })[]> => {
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
  excludeCardPayments = false,
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
          ...(excludeCardPayments && {
            transactionType: {
              not: TransactionType.CARD_PAYMENT,
            },
          }),
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
  return cards.map(calculateCardFinancials);
};

export const getBudgetIncomeTransactions = async (
  tx: PrismaClient,
  budgetId: string,
): Promise<Transaction[]> => {
  // All INCOME transactions on the budget's debit cards
  return tx.transaction.findMany({
    where: {
      budgetId: budgetId,
      transactionType: TransactionType.INCOME,
      deleted: null,
      card: {
        budgetId: budgetId,
        cardType: {
          in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
        },
        deleted: null,
      },
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
};

export const calculateBudgetIncome = async (
  tx: PrismaClient,
  budgetId: string,
): Promise<number> => {
  const result = await tx.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      budgetId: budgetId,
      transactionType: TransactionType.INCOME,
      deleted: null,
      card: {
        budgetId: budgetId,
        cardType: {
          in: [CardType.DEBIT, CardType.BUSINESS_DEBIT],
        },
        deleted: null,
      },
    },
  });

  return result._sum.amount ?? 0;
};
