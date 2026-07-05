import { type CategoryType } from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import type { z } from "zod";
import type { createCategorySchema } from "../api-schemas/categories";
import { HttpError } from "../errors";
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

  // Repoint budget copies that reference the source templates to the survivor.
  await tx.category.updateMany({
    where: { defaultCategoryId: { in: sourceIds } },
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
