import {
  type User,
  type Card,
  type CardType,
  TransactionType,
} from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import type { createCardSchema, updateCardSchema } from "../api-schemas/cards";
import type { z } from "zod";
import { HttpError } from "../errors";
import {
  calculateCardFinancials,
  calculateGeneralCardFinancials,
} from "./card-financials";

export async function getCards(
  tx: PrismaClientTx,
  params: URLSearchParams,
  user: User & { accountId: string },
) {
  const excludeCardPayments = params.get("excludeCardPayments") === "true";
  const budgetId = params.get("budgetId");
  const general = params.get("general") === "true";

  // Get all users in the same account
  const accountUsers = await tx.accountUser.findMany({
    where: {
      accountId: user.accountId,
    },
    select: {
      userId: true,
    },
  });

  const userIds = accountUsers.map((au) => au.userId);

  const transactionsFilter = {
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
  };

  if (general) {
    // General (template) cards have no budgetId of their own — their
    // amountSpent is rolled up from every budget card linked to them.
    const generalCards = await tx.card.findMany({
      where: {
        userId: {
          in: userIds,
        },
        deleted: null,
        budgetId: null,
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
        transactions: transactionsFilter,
        budgetCards: {
          where: { deleted: null },
          include: {
            transactions: transactionsFilter,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return generalCards.map(calculateGeneralCardFinancials);
  }

  const cards = await tx.card.findMany({
    where: {
      userId: {
        in: userIds,
      },
      deleted: null,
      // Never mix general (template) cards into budget-card lists — callers
      // attach transactions/payments to these, which templates can't take.
      budgetId: budgetId ?? { not: null },
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
      transactions: transactionsFilter,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate amountSpent for each card by summing related transactions
  return cards.map(calculateCardFinancials);
}

export async function getCardById(
  tx: PrismaClientTx,
  id: string,
  accountId: string,
  excludeCardPayments = false,
) {
  const transactionsFilter = {
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
  };

  const card = await tx.card.findFirst({
    where: {
      id,
      deleted: null,
      user: {
        accountUsers: {
          some: {
            accountId: accountId,
          },
        },
        deleted: null,
      },
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
      transactions: transactionsFilter,
      budgetCards: {
        where: { deleted: null },
        include: {
          transactions: transactionsFilter,
        },
      },
    },
  });

  if (!card) {
    throw new HttpError("Card not found", 404);
  }

  // A general (template) card's financials roll up its linked budget cards;
  // a budget card's come from its own transactions.
  return card.budgetId === null
    ? calculateGeneralCardFinancials(card)
    : calculateCardFinancials(card);
}

// Find the user's general (template) card matching the given identity —
// preferring the last-four-digits match when available, otherwise a
// case-insensitive trimmed name match, always scoped to the same cardType so
// debit and credit cards never share a template — lazily creating one if
// none exists. Mirrors the default-category resolution in createBudgetCategory.
export async function resolveDefaultCard(
  tx: PrismaClientTx,
  params: {
    name: string;
    lastFourDigits?: string | null;
    cardType: CardType;
    spendingLimit?: number | null;
    userId: string;
  },
): Promise<Card> {
  const trimmedName = params.name.trim();
  const lastFourDigits = params.lastFourDigits?.length
    ? params.lastFourDigits
    : null;

  let generalCard = lastFourDigits
    ? await tx.card.findFirst({
        where: {
          budgetId: null,
          userId: params.userId,
          lastFourDigits,
          cardType: params.cardType,
          deleted: null,
        },
      })
    : await tx.card.findFirst({
        where: {
          budgetId: null,
          userId: params.userId,
          name: { equals: trimmedName, mode: "insensitive" },
          cardType: params.cardType,
          deleted: null,
        },
      });

  // No matching general card yet — create one so future budget cards with
  // this identity can link back to it too
  generalCard ??= await tx.card.create({
    data: {
      name: trimmedName,
      lastFourDigits,
      cardType: params.cardType,
      spendingLimit: params.spendingLimit,
      userId: params.userId,
    },
  });

  return generalCard;
}

export async function createCard(
  tx: PrismaClientTx,
  data: z.infer<typeof createCardSchema>,
  user: User & { accountId: string },
) {
  // Verify that the requested userId belongs to the same account
  const accountUser = await tx.accountUser.findFirst({
    where: {
      accountId: user.accountId,
      userId: data.userId,
    },
  });

  if (!accountUser) {
    throw new HttpError("User not found in account", 400);
  }

  const lastFourDigits = data.lastFourDigits?.length
    ? data.lastFourDigits
    : null;

  if (!data.budgetId) {
    // Creating a general (template) card directly — guard against creating a
    // duplicate of one that already exists for this user with the same cardType.
    const trimmedName = data.name.trim();

    const existingGeneralCard = await tx.card.findFirst({
      where: {
        budgetId: null,
        userId: data.userId,
        cardType: data.cardType,
        deleted: null,
        OR: [
          { name: { equals: trimmedName, mode: "insensitive" } },
          ...(lastFourDigits ? [{ lastFourDigits }] : []),
        ],
      },
    });

    if (existingGeneralCard) {
      throw new HttpError("A card with this name already exists", 409);
    }

    return await tx.card.create({
      data: {
        name: trimmedName,
        lastFourDigits,
        cardType: data.cardType,
        spendingLimit: data.spendingLimit,
        userId: data.userId,
      },
    });
  }

  // Creating a budget card — link it to (and lazily create) its general card
  const defaultCard = await resolveDefaultCard(tx, {
    name: data.name,
    lastFourDigits,
    cardType: data.cardType,
    spendingLimit: data.spendingLimit,
    userId: data.userId,
  });

  return await tx.card.create({
    data: {
      name: defaultCard.name,
      lastFourDigits,
      cardType: data.cardType,
      spendingLimit: data.spendingLimit,
      userId: data.userId,
      budgetId: data.budgetId,
      defaultCardId: defaultCard.id,
    },
  });
}

export async function updateCard(
  tx: PrismaClientTx,
  id: string,
  data: z.infer<typeof updateCardSchema>,
  user: User & { accountId: string },
) {
  // If we're changing the userId, verify the new user belongs to the same account
  if (data.userId) {
    const accountUser = await tx.accountUser.findFirst({
      where: {
        accountId: user.accountId,
        userId: data.userId,
      },
    });
    if (!accountUser) {
      throw new HttpError("User not found in account", 400);
    }
  }

  // Find the card first to get its current userId/budgetId for the where clause
  const existingCard = await tx.card.findFirst({
    where: {
      id,
      deleted: null,
      user: {
        accountUsers: { some: { accountId: user.accountId } },
        deleted: null,
      },
    },
    select: {
      userId: true,
      budgetId: true,
      name: true,
      lastFourDigits: true,
      cardType: true,
      spendingLimit: true,
    },
  });

  if (!existingCard) {
    throw new HttpError("Card not found", 404);
  }

  const lastFourDigits = data.lastFourDigits?.length
    ? data.lastFourDigits
    : null;

  // A budget card whose identity is changing needs to be relinked to the
  // general card matching its new identity, not the one matching its old one.
  const isBudgetCard = existingCard.budgetId !== null;
  const isChangingIdentity =
    Boolean(data.name) ||
    data.lastFourDigits !== undefined ||
    Boolean(data.cardType);
  const relinkedDefaultCard =
    isBudgetCard && isChangingIdentity
      ? await resolveDefaultCard(tx, {
          name: data.name ?? existingCard.name,
          lastFourDigits:
            data.lastFourDigits !== undefined
              ? lastFourDigits
              : existingCard.lastFourDigits,
          cardType: data.cardType ?? existingCard.cardType,
          spendingLimit: data.spendingLimit ?? existingCard.spendingLimit,
          userId: data.userId ?? existingCard.userId,
        })
      : null;

  const updatedCard = await tx.card.update({
    where: {
      id,
      userId: existingCard.userId, // Use the existing userId to find the card
      deleted: null,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.lastFourDigits !== undefined && { lastFourDigits }),
      ...(data.cardType && { cardType: data.cardType }),
      ...(data.spendingLimit !== undefined && {
        spendingLimit: data.spendingLimit,
      }),
      ...(data.budgetId && { budgetId: data.budgetId }),
      ...(data.userId && { userId: data.userId }),
      ...(relinkedDefaultCard && { defaultCardId: relinkedDefaultCard.id }),
    },
  });

  // General (template) cards propagate name/last-four-digits changes to
  // every budget card linked to them so both stay in sync.
  const isGeneralCard = existingCard.budgetId === null;
  const isChangingNameOrLastFourDigits =
    Boolean(data.name) || data.lastFourDigits !== undefined;
  if (isGeneralCard && isChangingNameOrLastFourDigits) {
    await tx.card.updateMany({
      where: {
        defaultCardId: id,
        deleted: null,
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.lastFourDigits !== undefined && { lastFourDigits }),
      },
    });
  }

  return updatedCard;
}

export async function deleteCard(
  tx: PrismaClientTx,
  id: string,
  userId: string,
) {
  return await tx.card.update({
    where: {
      id,
      userId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });
}

//transactions region

export const getCardTransactions = async (tx: PrismaClientTx, cardId: string) =>
  await tx.transaction.findMany({
    where: {
      deleted: null,
      // A general (template) card's transactions are the union of the
      // transactions on every budget card linked to it.
      card: {
        OR: [{ id: cardId }, { defaultCardId: cardId }],
      },
    },
    include: {
      category: true,
      Budget: true,
      card: {
        select: {
          id: true,
          name: true,
          cardType: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
