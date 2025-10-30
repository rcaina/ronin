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

export type CreateSavingsSchema = z.infer<typeof createSavingsSchema>;
export type CreatePocketSchema = z.infer<typeof createPocketSchema>;



