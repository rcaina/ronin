import type { z } from "zod";
import { featureSettingsSchema } from "@/lib/types/feature-settings";

/**
 * Body shape accepted by `PATCH /api/account/feature-settings` — any subset
 * of the toggleable keys. The service layer merges this over the account's
 * existing (parsed-with-fallback) settings, so omitted keys are untouched.
 */
export const updateFeatureSettingsSchema = featureSettingsSchema.partial();

export type UpdateFeatureSettingsSchema = z.infer<
  typeof updateFeatureSettingsSchema
>;
