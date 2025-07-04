import { type PrismaClient, type User } from "@prisma/client";
import type { UpdateIncomeSchema, CreateIncomeSchema, UpdateSingleIncomeSchema } from "@/lib/api-schemas/income";

export async function updateBudgetIncome(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  budgetId: string,
  data: UpdateIncomeSchema,
  user: User & { accountId: string }
) {
  // Get existing incomes for this budget
  const existingIncomes = await tx.income.findMany({
    where: {
      budgetId,
      accountId: user.accountId,
      deleted: null,
    },
  });

  // Create maps for efficient lookup
  const existingIncomeMap = new Map(existingIncomes.map(income => [income.id, income]));
  const newIncomeMap = new Map(data.incomes.map(income => [income.id, income]));

  // Find incomes to delete (exist in DB but not in new data)
  const incomesToDelete = existingIncomes.filter(income => !newIncomeMap.has(income.id));

  // Find incomes to update (exist in both DB and new data)
  const incomesToUpdate = data.incomes.filter(income => 
    existingIncomeMap.has(income.id) && !income.id.startsWith('temp-')
  );

  // Find incomes to create (new or temp IDs)
  const incomesToCreate = data.incomes.filter(income => 
    !existingIncomeMap.has(income.id) || income.id.startsWith('temp-')
  );

  // Delete removed incomes
  if (incomesToDelete.length > 0) {
    await tx.income.updateMany({
      where: {
        id: { in: incomesToDelete.map(income => income.id) },
        budgetId,
        accountId: user.accountId,
        deleted: null,
      },
      data: {
        deleted: new Date(),
      },
    });
  }

  // Update existing incomes
  const updatedIncomes = [];
  for (const income of incomesToUpdate) {
    const updatedIncome = await tx.income.update({
      where: {
        id: income.id,
        budgetId,
        accountId: user.accountId,
        deleted: null,
      },
      data: {
        amount: income.amount,
        source: income.source,
        description: income.description,
        isPlanned: income.isPlanned,
        frequency: income.frequency,
      },
    });
    updatedIncomes.push(updatedIncome);
  }

  // Create new incomes
  const createdIncomes = [];
  for (const income of incomesToCreate) {
    const createdIncome = await tx.income.create({
      data: {
        accountId: user.accountId,
        userId: user.id,
        budgetId,
        amount: income.amount,
        source: income.source,
        description: income.description,
        isPlanned: income.isPlanned,
        frequency: income.frequency,
        receivedAt: new Date(),
      },
    });
    createdIncomes.push(createdIncome);
  }

  return {
    deleted: incomesToDelete.length,
    updated: updatedIncomes,
    created: createdIncomes,
  };
}

export async function createIncome(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  budgetId: string,
  data: CreateIncomeSchema,
  user: User & { accountId: string }
) {
  return await tx.income.create({
    data: {
      accountId: user.accountId,
      userId: user.id,
      budgetId,
      amount: data.amount,
      source: data.source,
      description: data.description,
      isPlanned: data.isPlanned,
      frequency: data.frequency,
      receivedAt: new Date(),
    },
  });
}

export async function updateIncome(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  incomeId: string,
  budgetId: string,
  data: UpdateSingleIncomeSchema,
  user: User & { accountId: string }
) {
  return await tx.income.update({
    where: {
      id: incomeId,
      budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      amount: data.amount,
      source: data.source,
      description: data.description,
      isPlanned: data.isPlanned,
      frequency: data.frequency,
    },
  });
}

export async function deleteIncome(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  incomeId: string,
  budgetId: string,
  user: User & { accountId: string }
) {
  return await tx.income.update({
    where: {
      id: incomeId,
      budgetId,
      accountId: user.accountId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });
} 