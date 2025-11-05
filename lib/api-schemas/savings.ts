import { z } from "zod";

export const createSavingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const createPocketSchema = z.object({
  name: z.string().min(1, "Name is required"),
  savingsId: z.string().min(1, "Savings account is required"),
  goalAmount: z.number().optional(),
  goalDate: z.string().optional(),
  goalNote: z.string().optional(),
});

export const updatePocketSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  goalAmount: z.number().nullable().optional(),
  goalDate: z.string().nullable().optional(),
  goalNote: z.string().nullable().optional(),
});

export const createAllocationSchema = z.object({
  pocketId: z.string().min(1, "Pocket ID is required"),
  amount: z.number().positive("Amount must be positive"),
  note: z.string().optional(),
  withdrawal: z.boolean().optional().default(false),
});

export const updateAllocationSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  withdrawal: z.boolean().optional().default(false),
});

export type CreateSavingsSchema = z.infer<typeof createSavingsSchema>;
export type CreatePocketSchema = z.infer<typeof createPocketSchema>;
export type UpdatePocketSchema = z.infer<typeof updatePocketSchema>;
export type CreateAllocationSchema = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationSchema = z.infer<typeof updateAllocationSchema>;



