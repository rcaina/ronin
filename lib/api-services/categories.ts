import { type CategoryType } from "@prisma/client"
import type { PrismaClientTx } from "../prisma";
import type { z } from "zod";
import type { createCategorySchema } from "../api-schemas/categories";

export interface CreateCategoryData {
  name: string;
  group: CategoryType;
}

export interface UpdateCategoryData {
  name: string;
  group: CategoryType;
}

export interface GroupedCategories {
  wants: Array<{
    id: string;
    name: string;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
  needs: Array<{
    id: string;
    name: string;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
  investment: Array<{
    id: string;
    name: string;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function getCategories(
  tx: PrismaClientTx
): Promise<GroupedCategories> {
  const categories = await tx.category.findMany({
    where: {
      deleted: null,
      budgetId: null, // Only get default/template categories
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Group categories by type
  const grouped: GroupedCategories = {
    wants: [],
    needs: [],
    investment: [],
  };

  categories.forEach(category => {
    const categoryData = {
      id: category.id,
      name: category.name,
      group: category.group,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };

    switch (category.group) {
      case 'WANTS':
        grouped.wants.push(categoryData);
        break;
      case 'NEEDS':
        grouped.needs.push(categoryData);
        break;
      case 'INVESTMENT':
        grouped.investment.push(categoryData);
        break;
    }
  });

  return grouped;
}

export async function createCategory(
  tx: PrismaClientTx,
  data: z.infer<typeof createCategorySchema>
) {
  return await tx.category.create({
    data: {
      name: data.name,
      group: data.group as CategoryType,
      budgetId: null, // Default categories have no budgetId
    },
  });
}

export async function deleteCategory(
  tx: PrismaClientTx,
  id: string
) {
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
  data: UpdateCategoryData
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