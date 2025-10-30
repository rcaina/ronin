import type { User } from "@prisma/client";
import type { PrismaClientTx } from "@/lib/prisma";
import type { CreatePocketSchema, CreateSavingsSchema } from "@/lib/api-schemas/savings";

export const getSavings = async (
  tx: PrismaClientTx,
  accountId: string,
) => await tx.savings.findMany({
    where: { accountId, deleted: null },
    include: {
      pockets: { include: { allocations: true } },
      budget: true,
    },
    orderBy: { createdAt: "desc" },
  })
  
export const createSavings = async (
  tx: PrismaClientTx,
  data: CreateSavingsSchema,
  user: User & { accountId: string },
) => await tx.savings.create({
    data: {
      name: data.name,
      accountId: user.accountId,
      userId: user.id,
      budgetId: null,
    },
    include: {
      pockets: { include: { allocations: true } },
      budget: true,
    },
  });


export const getPockets = async (
  tx: PrismaClientTx,
  accountId: string,
  savingsId?: string,
) => await tx.pocket.findMany({
    where: {
      savings: {
        accountId,
        deleted: null,
        ...(savingsId ? { id: savingsId } : {}),
      },
      deleted: null,
    },
    include: { allocations: true, savings: { include: { budget: true } } },
    orderBy: { createdAt: "desc" },
  });

export const createPocket = async (
  tx: PrismaClientTx,
  data: CreatePocketSchema,
  user: User & { accountId: string },
) => {
  const savings = await tx.savings.findFirst({
    where: { id: data.savingsId, accountId: user.accountId, deleted: null },
    select: { id: true },
  });
  
  if (!savings) return null;

  return await tx.pocket.create({
    data: {
      name: data.name,
      savingsId: data.savingsId,
      goalAmount: data.goalAmount,
      goalDate: data.goalDate ? new Date(data.goalDate) : undefined,
      goalNote: data.goalNote,
    },
    include: { allocations: true },
  });
}


