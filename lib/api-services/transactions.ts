import { type PrismaClient, type User } from "@prisma/client"
import type { CreateTransactionSchema, UpdateTransactionSchema } from "@/lib/api-schemas/transactions"

export async function getTransactions(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  accountId: string
) {
  return await tx.transaction.findMany({
    where: {
      accountId,
      deleted: null,
    },
    include: {
      category: {
        include: {
          category: true,
        },
      },
      Budget: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function createTransaction(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateTransactionSchema,
  user: User & { accountId: string }
) {
  return await tx.transaction.create({
    data: {
      name: data.name,
      description: data.description,
      amount: data.amount,
      budgetId: data.budgetId,
      categoryId: data.categoryId,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      accountId: user.accountId,
      userId: user.id,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: {
      category: {
        include: {
          category: true,
        },
      },
      Budget: true,
    },
  })
}

export async function updateTransaction(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
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
      categoryId: data.categoryId,
      cardId: data.cardId && data.cardId.trim() !== "" ? data.cardId : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    },
    include: {
      category: {
        include: {
          category: true,
        },
      },
      Budget: true,
    },
  })
}

export async function deleteTransaction(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
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