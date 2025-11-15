import {  type User, TransactionType } from "@prisma/client"
import type { CreateTransactionSchema, UpdateTransactionSchema, CreateCardPaymentSchema } from "@/lib/api-schemas/transactions"
import type { PrismaClientTx } from "../prisma"

export const getTransactions = async (
  tx: PrismaClientTx,
  accountId: string,
  pagination?: { page: number; limit: number; offset: number }
) => {
  const where = {
    accountId,
    deleted: null,
  };

  const include = {
    category: {
      include: {
        defaultCategory: true,
      },
    },
    Budget: true,
  };

  const orderBy = {
    createdAt: "desc" as const,
  };

  if (pagination) {
    const [transactions, totalCount] = await Promise.all([
      tx.transaction.findMany({
        where,
        include,
        orderBy,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      tx.transaction.count({ where }),
    ]);

    return { transactions, totalCount };
  } else {
    // For backward compatibility, return all transactions
    const transactions = await tx.transaction.findMany({
      where,
      include,
      orderBy,
    });
    return { transactions, totalCount: transactions.length };
  }
}

export const createTransaction = async (
  tx: PrismaClientTx,
  data: CreateTransactionSchema,
  user: User & { accountId: string }
) => {
  // Create the transaction first
  const transaction = await tx.transaction.create({
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId: data.categoryId && data.categoryId.trim() !== "" ? data.categoryId : null,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      accountId: user.accountId,
      userId: user.id,
      transactionType: data.transactionType ?? TransactionType.REGULAR,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: {
      category: {
        include: {
          defaultCategory: true,
        },
      },
      Budget: true,
    },
  });


  return transaction;
}

export async function updateTransaction(
  tx: PrismaClientTx,
  id: string,
  data: UpdateTransactionSchema,
  user: User & { accountId: string }
) {
  return await tx.transaction.update({
    where: {
      id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId: data.categoryId && data.categoryId.trim() !== "" ? data.categoryId : null,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      transactionType: data.transactionType,
    },
    include: {
      category: {
        include: {
          defaultCategory: true,
        },
      },
      Budget: true,
    },
  })
}

export async function deleteTransaction(
  tx: PrismaClientTx,
  id: string,
  user: User & { accountId: string }
) {
  return await tx.transaction.update({
    where: {
      id,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  })
}

export async function createCardPayment(
  tx: PrismaClientTx,
  data: CreateCardPaymentSchema,
  user: User & { accountId: string }
) {
  // Create two linked transactions: 
  // 1. Source card (debit/cash): negative amount (money going out)
  // 2. Destination card (credit): positive amount (money being added back to credit card)
  const fromTransaction = await tx.transaction.create({
    data: {
      name: data.name ?? `Payment from ${data.fromCardId}`,
      description: data.description ?? `Card payment to ${data.toCardId}`,
      amount: data.amount, // Negative amount for source card (money going out)
      budgetId: data.budgetId,
      categoryId: null, // No category for card payments
      cardId: data.fromCardId,
      accountId: user.accountId,
      userId: user.id,
      transactionType: TransactionType.CARD_PAYMENT,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: {
      category: {
        include: {
          defaultCategory: true,
        },
      },
      Budget: true,
    },
  });

  const toTransaction = await tx.transaction.create({
    data: {
      name: data.name ?? `Payment to ${data.toCardId}`,
      description: data.description ?? `Card payment from ${data.fromCardId}`,
      amount: data.amount, // Positive amount for destination card (money being added back)
      budgetId: data.budgetId,
      categoryId: null, // No category for card payments
      cardId: data.toCardId,
      accountId: user.accountId,
      userId: user.id,
      transactionType: TransactionType.CARD_PAYMENT,
      linkedTransactionId: fromTransaction.id, // Link to the source transaction
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: {
      category: {
        include: {
          defaultCategory: true,
        },
      },
      Budget: true,
    },
  });

  // Update the source transaction to link to the destination transaction
  await tx.transaction.update({
    where: { id: fromTransaction.id },
    data: { linkedTransactionId: toTransaction.id },
  });

  return {
    fromTransaction,
    toTransaction,
  };
} 