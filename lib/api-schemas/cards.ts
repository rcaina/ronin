import { z } from "zod";
import { CardType } from "@prisma/client";

export const createCardSchema = z.object({
  name: z.string().min(1),
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.number().optional(),
  userId: z.string().min(1),
});

export const updateCardSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cardType: z.nativeEnum(CardType).optional(),
  spendingLimit: z.number().min(0).optional(),
}); 