import type { CategoryType } from "@prisma/client";

/** A default/template category as serialized by the /api/categories endpoints. */
export interface CategorySummary {
  id: string;
  name: string;
  group: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedCategories {
  wants: CategorySummary[];
  needs: CategorySummary[];
  investment: CategorySummary[];
}

export interface CreateCategoryRequest {
  name: string;
  group: CategoryType;
}

export interface UpdateCategoryRequest {
  name: string;
  group: CategoryType;
}

export interface MergeCategoriesRequest {
  /** IDs of the default categories being merged away. */
  sourceIds: string[];
  /** ID of the default category the user chose to keep. */
  targetId: string;
}
