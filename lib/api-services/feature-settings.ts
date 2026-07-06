import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../errors";
import {
  parseFeatureSettings,
  type FeatureSettings,
} from "../types/feature-settings";
import type { UpdateFeatureSettingsSchema } from "../api-schemas/feature-settings";

type AccountPrisma = Pick<PrismaClient, "account">;

/** Loads the account's module preferences, parsed-with-fallback. */
export const getFeatureSettings = async (
  prisma: AccountPrisma,
  accountId: string,
): Promise<FeatureSettings> => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { featureSettings: true },
  });

  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  return parseFeatureSettings(account.featureSettings);
};

/**
 * Merges `patch` over the account's existing (parsed-with-fallback) feature
 * settings and persists the full, complete object. Returns the merged
 * result so the route can echo it back to the caller.
 */
export const updateFeatureSettings = async (
  tx: AccountPrisma,
  accountId: string,
  patch: UpdateFeatureSettingsSchema,
): Promise<FeatureSettings> => {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { featureSettings: true },
  });

  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  const current = parseFeatureSettings(account.featureSettings);
  const merged: FeatureSettings = { ...current, ...patch };

  await tx.account.update({
    where: { id: accountId },
    data: { featureSettings: merged as Prisma.InputJsonValue },
  });

  return merged;
};
