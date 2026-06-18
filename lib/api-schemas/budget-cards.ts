import { z } from "zod";

export const importBudgetCardsSchema = z.object({
  sourceBudgetId: z.string().min(1, "Source budget is required"),
  cardIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one card to import"),
});
