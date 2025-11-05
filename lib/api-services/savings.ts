import type { User } from "@prisma/client";
import type { PrismaClientTx } from "@/lib/prisma";
import type { CreatePocketSchema, CreateSavingsSchema, UpdatePocketSchema, CreateAllocationSchema, UpdateAllocationSchema } from "@/lib/api-schemas/savings";

export const getSavings = async (
  tx: PrismaClientTx,
  accountId: string,
) => await tx.savings.findMany({
    where: { accountId, deleted: null },
    include: {
      pockets: { include: { allocations: true } },
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
    },
    include: {
      pockets: { include: { allocations: true } },
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
    include: { allocations: true, savings: true },
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

export const getSavingsById = async (
  tx: PrismaClientTx,
  id: string,
  accountId: string,
) => await tx.savings.findFirst({
  where: { id, accountId, deleted: null },
  include: {
    pockets: {
      where: { deleted: null },
      include: { 
        allocations: true,
      },
      orderBy: { createdAt: "desc" },
    },
  },
});

export const getPocketById = async (
  tx: PrismaClientTx,
  pocketId: string,
  accountId: string,
) => await tx.pocket.findFirst({
  where: {
    id: pocketId,
    savings: {
      accountId,
      deleted: null,
    },
    deleted: null,
  },
  include: { allocations: true },
});

export const updatePocket = async (
  tx: PrismaClientTx,
  pocketId: string,
  data: UpdatePocketSchema,
  accountId: string,
) => {
  // Verify pocket belongs to account
  const pocket = await tx.pocket.findFirst({
    where: {
      id: pocketId,
      savings: {
        accountId,
        deleted: null,
      },
      deleted: null,
    },
    select: { id: true },
  });

  if (!pocket) return null;

  return await tx.pocket.update({
    where: { id: pocketId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.goalAmount !== undefined && { goalAmount: data.goalAmount }),
      ...(data.goalDate !== undefined && { goalDate: data.goalDate }),
      ...(data.goalNote !== undefined && { goalNote: data.goalNote }),
    },
    include: { allocations: true },
  });
}

export const deletePocket = async (
  tx: PrismaClientTx,
  pocketId: string,
  accountId: string,
) => {
  // Verify pocket belongs to account
  const pocket = await tx.pocket.findFirst({
    where: {
      id: pocketId,
      savings: {
        accountId,
        deleted: null,
      },
      deleted: null,
    },
    select: { id: true },
  });

  if (!pocket) return null;

  return await tx.pocket.update({
    where: { id: pocketId },
    data: {
      deleted: new Date(),
    },
  });
}

export const createAllocation = async (
  tx: PrismaClientTx,
  data: CreateAllocationSchema,
  accountId: string,
  user: User,
) => {
  // Verify pocket belongs to account
  const pocket = await tx.pocket.findFirst({
    where: {
      id: data.pocketId,
      savings: {
        accountId,
        deleted: null,
      },
      deleted: null,
    },
    select: { id: true },
  });

  if (!pocket) return null;

  // Always save positive amount, use withdrawal flag to indicate direction
  return await tx.allocation.create({
    data: {
      pocketId: data.pocketId,
      userId: user.id,
      amount: data.amount,
      withdrawal: data.withdrawal ?? false,
      note: data.note ? String(data.note) : null,
    },
    include: {
      pocket: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export const updateAllocation = async (
  tx: PrismaClientTx,
  allocationId: string,
  data: UpdateAllocationSchema,
  accountId: string,
) => {
  // Verify allocation belongs to account through pocket -> savings
  const allocation = await tx.allocation.findFirst({
    where: {
      id: allocationId,
      pocket: {
        savings: {
          accountId,
          deleted: null,
        },
        deleted: null,
      },
    },
    select: { id: true, withdrawal: true },
  });

  if (!allocation) return null;

  // Always save positive amount, use withdrawal flag to indicate direction
  return await tx.allocation.update({
    where: { id: allocationId },
    data: {
      amount: Math.abs(data.amount),
      withdrawal: data.withdrawal ?? allocation.withdrawal,
    },
    include: {
      pocket: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export const deleteAllocation = async (
  tx: PrismaClientTx,
  allocationId: string,
  accountId: string,
) => {
  // Verify allocation belongs to account through pocket -> savings
  const allocation = await tx.allocation.findFirst({
    where: {
      id: allocationId,
      pocket: {
        savings: {
          accountId,
          deleted: null,
        },
        deleted: null,
      },
    },
    select: { id: true },
  });

  if (!allocation) return null;

  return await tx.allocation.delete({
    where: { id: allocationId },
  });
}


