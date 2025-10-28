import { CategoryType } from "@prisma/client";
import { z } from "zod";

export const createBudgetCategorySchema = z.object({
    categoryName: z.string().min(1, "Category name is required"),
    group: z.nativeEnum(CategoryType),
    allocatedAmount: z.number().positive("Allocated amount must be positive"),
  });

export const updateBudgetCategorySchema = z.object({
    allocatedAmount: z.number().positive("Allocated amount must be positive").optional(),
    name: z.string().min(1, "Category name is required").max(100, "Category name must be less than 100 characters").optional(),
    group: z.nativeEnum(CategoryType).optional(),
  });