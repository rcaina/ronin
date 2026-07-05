import { type CategoryType } from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import type { z } from "zod";
import type { createCategorySchema } from "../api-schemas/categories";
import { HttpError } from "../errors";
import { roundToCents } from "../utils";
import type {
  GroupedCategories,
  MergeCategoriesRequest,
  UpdateCategoryRequest,
} from "../types/category";

export async function getCategories(
  tx: PrismaClientTx,
): Promise<GroupedCategories> {
  const categories = await tx.category.findMany({
    where: {
      deleted: null,
      budgetId: null, // Only get default/template categories
      defaultCategoryId: null,
    },
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
) {
  return await tx.category.create({
    data: {
      name: data.name,
      group: data.group as CategoryType,
      budgetId: null, // Default categories have no budgetId
    },
  });
}

export async function deleteCategory(tx: PrismaClientTx, id: string) {
  return await tx.category.update({
    where: {
      id,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });
}

export async function updateCategory(
  tx: PrismaClientTx,
  id: string,
  data: UpdateCategoryRequest,
) {
  return await tx.category.update({
    where: {
      id,
      deleted: null,
    },
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
 * - Any transactions attached directly to a source template are repointed
 *   to the survivor.
 * - The source templates are soft-deleted.
 */
export async function mergeCategories(
  tx: PrismaClientTx,
  { sourceIds, targetId }: MergeCategoriesRequest,
) {
  const candidates = await tx.category.findMany({
    where: {
      id: { in: [targetId, ...sourceIds] },
      budgetId: null,
      defaultCategoryId: null,
      deleted: null,
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
  // others' transactions onto it, and fold their allocations in so the
  // budget's total allocation is unchanged.
  const budgetCopies = await tx.category.findMany({
    where: {
      budgetId: { not: null },
      defaultCategoryId: { in: [targetId, ...sourceIds] },
      deleted: null,
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
    await tx.transaction.updateMany({
      where: { categoryId: { in: duplicateIds } },
      data: { categoryId: survivor.id },
    });

    const hasAllocation = copies.some((copy) => copy.allocatedAmount !== null);
    if (hasAllocation) {
      const mergedAllocation = roundToCents(
        copies.reduce((sum, copy) => sum + (copy.allocatedAmount ?? 0), 0),
      );
      await tx.category.update({
        where: { id: survivor.id },
        data: { allocatedAmount: mergedAllocation },
      });
    }

    await tx.category.updateMany({
      where: { id: { in: duplicateIds } },
      data: { deleted: new Date() },
    });
  }

  // Repoint budget copies that reference the source templates to the survivor.
  await tx.category.updateMany({
    where: { defaultCategoryId: { in: sourceIds }, deleted: null },
    data: { defaultCategoryId: targetId },
  });

  // Safety net: repoint any transactions attached directly to the source
  // templates (default categories aren't normally transacted against, but
  // relink defensively rather than leave a dangling reference).
  await tx.transaction.updateMany({
    where: { categoryId: { in: sourceIds } },
    data: { categoryId: targetId },
  });

  await tx.category.updateMany({
    where: { id: { in: sourceIds } },
    data: { deleted: new Date() },
  });

  return target;
}
