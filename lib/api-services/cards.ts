import { CardType, type User, TransactionType } from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import type { createCardSchema, updateCardSchema } from "../api-schemas/cards";
import type { z } from "zod";
import { HttpError } from "../errors";

export async function getCards(
  tx: PrismaClientTx,
  params: URLSearchParams,
  user: User & { accountId: string }
) {
  const excludeCardPayments = params.get('excludeCardPayments') === 'true';
  const budgetId = params.get('budgetId');
  
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

  const cards = await tx.card.findMany({
    where: {
      userId: {
        in: userIds,
      },
      deleted: null,
      ...(budgetId && { budgetId }),
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
              not: TransactionType.CARD_PAYMENT
            }
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
  const cardsWithAmountSpent = cards.map(card => {
    const isCreditCard = card.cardType === CardType.CREDIT || card.cardType === CardType.BUSINESS_CREDIT;
    
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
      // For debit/cash cards: sum all amounts normally
      amountSpent = card.transactions.reduce((sum, transaction) => {
        if (transaction.transactionType === TransactionType.RETURN) {
          // Returns reduce the balance (positive amount = refund received)
          return sum - transaction.amount; // Subtract return amount (reduces balance)
        } else {
          // Regular transactions: positive = purchases (increase balance)
          return sum + transaction.amount;
        }
      }, 0);
    }
    
    return {
      ...card,
      amountSpent,
      transactions: undefined, // Remove transactions from response
    };
  });

  return cardsWithAmountSpent;
}

export async function getCardById(
  tx: PrismaClientTx,
  id: string,
  userId: string
) {
  const card = await tx.card.findFirst({
    where: {
      id,
      userId,
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
  });

  if (!card) {
    throw new HttpError("Card not found", 404);
  }

  // Calculate amountSpent by summing related transactions
  const isCreditCard = card.cardType === CardType.CREDIT || card.cardType === CardType.BUSINESS_CREDIT;
  
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
    // For debit/cash cards: sum all amounts normally
    amountSpent = card.transactions.reduce((sum, transaction) => {
      if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce the balance (positive amount = refund received)
        return sum - transaction.amount; // Subtract return amount (reduces balance)
      } else {
        // Regular transactions: positive = purchases (increase balance)
        return sum + transaction.amount;
      }
    }, 0);
  }

  const cardWithAmountSpent = {
    ...card,
    amountSpent,
    transactions: undefined, // Remove transactions from response
  };

  return cardWithAmountSpent;
}

export async function createCard(
  tx: PrismaClientTx,
  data: z.infer<typeof createCardSchema>,
  user: User & { accountId: string }
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

  return await tx.card.create({
    data: {
      name: data.name,
      cardType: data.cardType,
      spendingLimit: data.spendingLimit,
      userId: data.userId,
      budgetId: data.budgetId,
    },
  });
}

export async function updateCard(
  tx: PrismaClientTx,
  id: string,
  data: z.infer<typeof updateCardSchema>,
  user: User & { accountId: string }
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

  // Find the card first to get its current userId for the where clause
  const existingCard = await tx.card.findFirst({
    where: {
      id,
      deleted: null,
    },
    select: {
      userId: true,
    },
  });

  if (!existingCard) {
    throw new HttpError("Card not found", 404);
  }

  return await tx.card.update({
    where: {
      id,
      userId: existingCard.userId, // Use the existing userId to find the card
      deleted: null,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.cardType && { cardType: data.cardType }),
      ...(data.spendingLimit !== undefined && { spendingLimit: data.spendingLimit }),
      ...(data.budgetId && { budgetId: data.budgetId }),
      ...(data.userId && { userId: data.userId }),
    },
  });
}

export async function deleteCard(
  tx: PrismaClientTx,
  id: string,
  userId: string
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

export const getCardTransactions = async (
  tx: PrismaClientTx,
  cardId: string,
) => await tx.transaction.findMany({
  where: {
    cardId,
    deleted: null,
  },
  include: {
    category: {
      include: {
        category: true,
      },
    },
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