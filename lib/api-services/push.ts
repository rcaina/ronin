import type { Prisma } from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import type { CreatePushSubscriptionSchema } from "../api-schemas/push";

type PushPrisma = Pick<PrismaClientTx, "pushSubscription">;

/**
 * Registers (or re-registers) a browser's push subscription for a user.
 * `endpoint` is globally unique per the Push API spec, so re-subscribing the
 * same device/browser — even from a different account — upserts rather than
 * violating the unique constraint; the `userId` on the row always tracks
 * whoever most recently subscribed from that browser.
 */
export const upsertPushSubscription = async (
  tx: PushPrisma,
  userId: string,
  data: CreatePushSubscriptionSchema,
) =>
  tx.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: {
      userId,
      endpoint: data.endpoint,
      keys: data.keys as Prisma.InputJsonValue,
    },
    update: {
      userId,
      keys: data.keys as Prisma.InputJsonValue,
    },
  });

/**
 * Removes a subscription. Scoped to `userId` so a user can only unsubscribe
 * their own devices; a no-op (not an error) if it's already gone.
 */
export const deletePushSubscription = async (
  tx: PushPrisma,
  userId: string,
  endpoint: string,
): Promise<void> => {
  await tx.pushSubscription.deleteMany({ where: { userId, endpoint } });
};

/** Removes a subscription by endpoint alone — used when a push send comes
 * back stale (404/410), where we only know the endpoint, not the owner. */
export const deletePushSubscriptionByEndpoint = async (
  tx: PushPrisma,
  endpoint: string,
): Promise<void> => {
  await tx.pushSubscription.deleteMany({ where: { endpoint } });
};
