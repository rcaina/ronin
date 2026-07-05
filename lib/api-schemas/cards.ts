import { z } from "zod";
import { CardType } from "@prisma/client";

const lastFourDigitsSchema = z
  .string()
  .regex(/^\d{4}$/, "Must be exactly 4 digits")
  .optional()
  .or(z.literal(""));

export const createCardSchema = z.object({
  name: z.string().min(1),
  lastFourDigits: lastFourDigitsSchema,
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.number().optional(),
  userId: z.string().min(1),
  budgetId: z.string().min(1).optional(),
});

export const updateCardSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  lastFourDigits: lastFourDigitsSchema,
  cardType: z.nativeEnum(CardType).optional(),
  spendingLimit: z.number().min(0).optional(),
  budgetId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

export const mergeCardsSchema = z
  .object({
    sourceIds: z.array(z.string().min(1)).min(1),
    targetId: z.string().min(1),
  })
  .refine((data) => !data.sourceIds.includes(data.targetId), {
    message: "targetId must not be one of the sourceIds",
    path: ["targetId"],
  });
