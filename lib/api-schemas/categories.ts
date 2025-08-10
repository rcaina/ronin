import { z } from "zod";

import { CategoryType } from "@prisma/client";

export const createCategorySchema = z.object({
    name: z.string().min(2).max(100),
    group: z.enum(Object.values(CategoryType) as [string, ...string[]]),
  });

export const updateCategorySchema = z.object({
name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
group: z.enum(Object.values(CategoryType) as [string, ...string[]]),
});