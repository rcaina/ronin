import { z } from "zod";

import { CategoryType } from "@prisma/client";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  group: z.enum(Object.values(CategoryType) as [string, ...string[]]),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  group: z.enum(Object.values(CategoryType) as [string, ...string[]]),
});

export const mergeCategoriesSchema = z
  .object({
    sourceIds: z
      .array(z.string().min(1))
      .nonempty("Select at least one category to merge"),
    targetId: z.string().min(1, "A target category is required"),
  })
  .refine((data) => !data.sourceIds.includes(data.targetId), {
    message: "The category being kept can't also be a category being merged",
    path: ["targetId"],
  });
