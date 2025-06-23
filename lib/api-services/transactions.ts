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
      cardId: data.cardId,
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