import { z } from "zod";

// Zod schemas for API validation
export const createTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  budgetId: z.string().min(1, "Budget is required"),
  categoryId: z.string().min(1, "Category is required"),
  cardId: z.string().optional(),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  budgetId: z.string().min(1, "Budget is required").optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  cardId: z.string().optional(),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
});

// Export inferred types for convenience
export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionSchema = z.infer<typeof updateTransactionSchema>; 