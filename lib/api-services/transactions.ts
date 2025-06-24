import { type PrismaClient, type User } from "@prisma/client"

export interface CreateTransactionData {
  name?: string
  description?: string
  amount: number
  budgetId: string
  categoryId: string
  cardId?: string
  createdAt?: string
}

export interface UpdateTransactionData {
  name?: string
  description?: string
  amount?: number
  budgetId?: string
  categoryId?: string
  cardId?: string
  createdAt?: string
}

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
      category: true,
      Budget: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function createTransaction(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateTransactionData,
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
    },
    include: {
      category: true,
      Budget: true,
    },
  })
}

export async function updateTransaction(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  data: UpdateTransactionData,
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
    },
    include: {
      category: true,
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