import { type CategoryType } from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import type { z } from "zod";
import type { createCategorySchema } from "../api-schemas/categories";
import { HttpError } from "../errors";
import { roundToCents } from "../utils";
import { mergeHiddenFrom, mergeMonthPlans } from "../utils/budget-month";
import type {
  GroupedCategories,
  MergeCategoriesRequest,
  UpdateCategoryRequest,
} from "../types/category";

/** Where clause for an account's live template categories. */
export const accountTemplates = (accountId: string) => ({
  accountId,
  budgetId: null,
  defaultCategoryId: null,
  deleted: null,
});

export async function getCategories(
  tx: PrismaClientTx,
  accountId: string,
): Promise<GroupedCategories> {
  const categories = await tx.category.findMany({
    where: accountTemplates(accountId),
    orderBy: {
      name: "asc",
    },
  });

  // Group categories by type
  const grouped: GroupedCategories = {
    wants: [],
    needs: [],
    investment: [],
  };

  categories.forEach((category) => {
    const categoryData = {
      id: category.id,
      name: category.name,
      group: category.group,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };

    switch (category.group) {
      case "WANTS":
        grouped.wants.push(categoryData);
        break;
      case "NEEDS":
        grouped.needs.push(categoryData);
        break;
      case "INVESTMENT":
        grouped.investment.push(categoryData);
        break;
    }
  });

  return grouped;
}

export async function createCategory(
  tx: PrismaClientTx,
  data: z.infer<typeof createCategorySchema>,
  accountId: string,
) {
  return await tx.category.create({
    data: {
      name: data.name,
      group: data.group as CategoryType,
      accountId,
    },
  });
}

const assertAccountTemplate = async (
  tx: PrismaClientTx,
  id: string,
  accountId: string,
) => {
  const category = await tx.category.findFirst({
    where: { id, ...accountTemplates(accountId) },
    select: { id: true },
  });
  if (!category) {
    throw new HttpError("Category not found", 404);
  }
};

export async function deleteCategory(
  tx: PrismaClientTx,
  id: string,
  accountId: string,
) {
  await assertAccountTemplate(tx, id, accountId);
  return await tx.category.update({
    where: { id },
    data: {
      deleted: new Date(),
    },
  });
}

export async function updateCategory(
  tx: PrismaClientTx,
  id: string,
  data: UpdateCategoryRequest,
  accountId: string,
) {
  await assertAccountTemplate(tx, id, accountId);
  return await tx.category.update({
    where: { id },
    data: {
      name: data.name,
      group: data.group,
    },
  });
}

/**
 * Merges one or more default/template categories (`sourceIds`) into a
 * surviving category (`targetId`) that the user explicitly chose. The
 * survivor keeps its own name and group unchanged.
 *
 * - Budget-level copies that pointed at a source template are repointed to
 *   the survivor (`defaultCategoryId`).
 * - Any transactions, split legs and recurring templates attached directly to
 *   a source template are repointed to the survivor.
 * - The source templates are soft-deleted.
 */
export async function mergeCategories(
  tx: PrismaClientTx,
  { sourceIds, targetId }: MergeCategoriesRequest,
  accountId: string,
) {
  const candidates = await tx.category.findMany({
    where: {
      id: { in: [targetId, ...sourceIds] },
      ...accountTemplates(accountId),
    },
  });

  const target = candidates.find((category) => category.id === targetId);
  if (!target) {
    throw new HttpError(
      "Target category not found or is not a default category",
      404,
    );
  }

  const foundSourceIds = new Set(
    candidates
      .filter((category) => category.id !== targetId)
      .map((category) => category.id),
  );
  const missingSourceIds = sourceIds.filter((id) => !foundSourceIds.has(id));
  if (missingSourceIds.length > 0) {
    throw new HttpError(
      "One or more categories to merge were not found or are not default categories",
      404,
    );
  }

  // A budget may hold copies of both the survivor and a source template;
  // blindly repointing would leave that budget with two active categories
  // linked to the same template. Collapse per-budget duplicates first: keep
  // one copy per budget (preferring the survivor-linked one), move the
  // others' transactions, split legs and recurring templates onto it, and
  // fold their allocations and month plans in so the budget's totals are
  // unchanged.
  const budgetCopies = await tx.category.findMany({
    where: {
      budget: { accountId },
      defaultCategoryId: { in: [targetId, ...sourceIds] },
      deleted: null,
    },
    include: {
      months: { select: { month: true, assigned: true, hidden: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const copiesByBudget = new Map<string, typeof budgetCopies>();
  for (const copy of budgetCopies) {
    const budgetKey = copy.budgetId!;
    copiesByBudget.set(budgetKey, [
      ...(copiesByBudget.get(budgetKey) ?? []),
      copy,
    ]);
  }

  for (const copies of copiesByBudget.values()) {
    const survivor =
      copies.find((copy) => copy.defaultCategoryId === targetId) ?? copies[0]!;
    const duplicates = copies.filter((copy) => copy.id !== survivor.id);
    if (duplicates.length === 0) continue;

    const duplicateIds = duplicates.map((copy) => copy.id);
    const repoint = {
      where: { categoryId: { in: duplicateIds } },
      data: { categoryId: survivor.id },
    };
    await tx.transaction.updateMany(repoint);
    await tx.transactionSplit.updateMany(repoint);
    await tx.recurringTransaction.updateMany(repoint);

    const monthPlans = mergeMonthPlans(copies);
    if (monthPlans.length > 0) {
      await tx.categoryMonth.deleteMany({
        where: { categoryId: { in: copies.map((copy) => copy.id) } },
      });
      await tx.categoryMonth.createMany({
        data: monthPlans.map((plan) => ({ ...plan, categoryId: survivor.id })),
      });
    }

    const hasAllocation = copies.some((copy) => copy.allocatedAmount !== null);
    await tx.category.update({
      where: { id: survivor.id },
      data: {
        rollover: copies.some((copy) => copy.rollover),
        hiddenFrom: mergeHiddenFrom(copies),
        ...(hasAllocation && {
          allocatedAmount: roundToCents(
            copies.reduce((sum, copy) => sum + (copy.allocatedAmount ?? 0), 0),
          ),
        }),
      },
    });

    await tx.category.updateMany({
      where: { id: { in: duplicateIds } },
      data: { deleted: new Date() },
    });
  }

  // Repoint budget copies that reference the source templates to the survivor.
  await tx.category.updateMany({
    where: {
      defaultCategoryId: { in: sourceIds },
      deleted: null,
      budget: { accountId },
    },
    data: { defaultCategoryId: targetId },
  });

  // Safety net: repoint any transactions attached directly to the source
  // templates (default categories aren't normally transacted against, but
  // relink defensively rather than leave a dangling reference).
  const repointSources = {
    where: { categoryId: { in: sourceIds } },
    data: { categoryId: targetId },
  };
  await tx.transaction.updateMany(repointSources);
  await tx.transactionSplit.updateMany(repointSources);
  await tx.recurringTransaction.updateMany(repointSources);

  await tx.category.updateMany({
    where: { id: { in: sourceIds } },
    data: { deleted: new Date() },
  });

  return target;
}
