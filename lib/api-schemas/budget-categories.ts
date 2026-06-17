import { CategoryType } from "@prisma/client";
import { z } from "zod";

export const createBudgetCategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  group: z.nativeEnum(CategoryType),
  allocatedAmount: z.number().positive("Allocated amount must be positive"),
});

export const importBudgetCategoriesSchema = z.object({
  sourceBudgetId: z.string().min(1, "Source budget is required"),
  categoryIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one category to import"),
});

export const updateBudgetCategorySchema = z.object({
  allocatedAmount: z
    .number()
    .positive("Allocated amount must be positive")
    .optional(),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters")
    .optional(),
  group: z.nativeEnum(CategoryType).optional(),
});
