import { z } from "zod";
import { TransactionType } from "@prisma/client";

// Zod schemas for API validation
export const createTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number(), // Allow any number (positive, negative, or zero)
  budgetId: z.string().min(1, "Budget is required"),
  categoryId: z.string().optional(), // Optional for card payments
  cardId: z.string().optional(),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
  transactionType: z.nativeEnum(TransactionType).optional().default(TransactionType.REGULAR),
  pocketId: z.string().optional(), // Optional: allocate this transaction to a pocket
});

// Schema for card payment transactions
export const createCardPaymentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive("Payment amount must be positive"),
  budgetId: z.string().min(1, "Budget is required"),
  fromCardId: z.string().min(1, "Source card is required"),
  toCardId: z.string().min(1, "Destination card is required"),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(), // Allow any number (positive, negative, or zero)
  budgetId: z.string().min(1, "Budget is required").optional(),
  categoryId: z.string().optional(), // Optional for card payments
  cardId: z.string().optional(),
  createdAt: z.string().optional(),
  occurredAt: z.string().optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  pocketId: z.string().optional(),
});

// Export inferred types for convenience
export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionSchema = z.infer<typeof updateTransactionSchema>;
export type CreateCardPaymentSchema = z.infer<typeof createCardPaymentSchema>; 