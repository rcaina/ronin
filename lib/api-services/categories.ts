import { type PrismaClient, type CategoryType } from "@prisma/client"

export interface CreateCategoryData {
  name: string;
  spendingLimit: number;
  group: CategoryType;
}

export interface UpdateCategoryData {
  name: string;
  spendingLimit: number;
  group: CategoryType;
}

export interface GroupedCategories {
  wants: Array<{
    id: string;
    name: string;
    spendingLimit: number;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
  needs: Array<{
    id: string;
    name: string;
    spendingLimit: number;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
  investment: Array<{
    id: string;
    name: string;
    spendingLimit: number;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function getCategories(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
): Promise<GroupedCategories> {
  const categories = await tx.category.findMany({
    where: {
      deleted: null,
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
      spendingLimit: category.spendingLimit,
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
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateCategoryData
) {
  return await tx.category.create({
    data: {
      name: data.name,
      spendingLimit: data.spendingLimit,
      group: data.group,
    },
  });
}

export async function deleteCategory(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
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
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
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
      spendingLimit: data.spendingLimit,
      group: data.group,
    },
  });
} 