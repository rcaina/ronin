import { type PrismaClient } from "@prisma/client"

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