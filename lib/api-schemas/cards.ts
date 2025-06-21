import { z } from "zod";
import { CardType } from "@prisma/client";

export const createCardSchema = z.object({
  name: z.string().min(1),
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.number().optional(),
  userId: z.string().min(1),
}); 