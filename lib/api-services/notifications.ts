import type { Prisma } from "@prisma/client";
import type { PrismaClientTx } from "../prisma";
import { HttpError } from "../errors";
import { calculateCategorySpent } from "../utils/spending";
import {
  dedupeNotificationTargets,
  evaluateBudgetPeriodEnding,
  evaluateCategoryThreshold,
  notificationIdentityKey,
  type NotificationCandidate,
  type NotificationTarget,
} from "../utils/notifications";
import { parseFeatureSettings } from "../types/feature-settings";
import { parseNotificationSettings } from "../types/notification-settings";
import { isPremium } from "../utils/entitlements";
import { getAccountEntitlements } from "./entitlements";
import { sendPushNotification } from "@/server/push";
import { deletePushSubscriptionByEndpoint } from "./push";

type NotificationPrisma = Pick<
  PrismaClientTx,
  "notification" | "account" | "accountUser" | "budget" | "pushSubscription"
>;

// ---------------------------------------------------------------------------
// Inbox: reading and marking notifications read for the current user.
// ---------------------------------------------------------------------------

const NOTIFICATION_LIST_LIMIT = 30;

export const listNotificationsForUser = async (
  tx: Pick<PrismaClientTx, "notification">,
  userId: string,
) => {
  const [notifications, unreadCount] = await Promise.all([
    tx.notification.findMany({
      where: { userId, deleted: null },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATION_LIST_LIMIT,
    }),
    tx.notification.count({
      where: { userId, deleted: null, readAt: null },
    }),
  ]);

  return { notifications, unreadCount };
};

export const markNotificationRead = async (
  tx: Pick<PrismaClientTx, "notification">,
  userId: string,
  id: string,
) => {
  const notification = await tx.notification.findFirst({
    where: { id, userId, deleted: null },
  });
  if (!notification) {
    throw new HttpError("Notification not found", 404);
  }
  if (notification.readAt) return notification;

  return tx.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
};

export const markAllNotificationsRead = async (
  tx: Pick<PrismaClientTx, "notification">,
  userId: string,
): Promise<void> => {
  await tx.notification.updateMany({
    where: { userId, deleted: null, readAt: null },
    data: { readAt: new Date() },
  });
};

// ---------------------------------------------------------------------------
// Persistence: turning evaluated targets into `Notification` rows, deduped.
// ---------------------------------------------------------------------------

/**
 * Persists whichever `targets` don't already exist (by `(userId, dedupeKey)`
 * identity) and returns just the newly created ones. Combines the pure
 * in-memory filter (`dedupeNotificationTargets`) with a DB read of existing
 * identities for these exact users/keys, then relies on the
 * `(userId, dedupeKey)` unique index (`skipDuplicates: true`) as the final
 * backstop against a race between two concurrent evaluations.
 */
export const createDedupedNotifications = async (
  tx: Pick<PrismaClientTx, "notification">,
  targets: readonly NotificationTarget[],
): Promise<NotificationTarget[]> => {
  if (targets.length === 0) return [];

  const existing = await tx.notification.findMany({
    where: {
      OR: targets.map((t) => ({
        userId: t.userId,
        dedupeKey: t.candidate.dedupeKey,
      })),
    },
    select: { userId: true, dedupeKey: true },
  });
  const existingKeys = new Set(
    existing.map((e) =>
      notificationIdentityKey({
        userId: e.userId,
        candidate: { dedupeKey: e.dedupeKey } as NotificationCandidate,
      }),
    ),
  );

  const toCreate = dedupeNotificationTargets(targets, existingKeys);
  if (toCreate.length === 0) return [];

  await tx.notification.createMany({
    data: toCreate.map((t) => ({
      userId: t.userId,
      type: t.candidate.type,
      title: t.candidate.title,
      body: t.candidate.body,
      data: t.candidate.data as Prisma.InputJsonValue | undefined,
      dedupeKey: t.candidate.dedupeKey,
    })),
    skipDuplicates: true,
  });

  return toCreate;
};

// ---------------------------------------------------------------------------
// Push mirroring: for premium accounts, mirror newly created notifications
// to every subscribed device. Best-effort — a push failure never rolls back
// the in-app notification, which is the source of truth.
// ---------------------------------------------------------------------------

const sendPushForTargets = async (
  tx: Pick<PrismaClientTx, "pushSubscription">,
  targets: readonly NotificationTarget[],
): Promise<void> => {
  const userIds = [...new Set(targets.map((t) => t.userId))];
  if (userIds.length === 0) return;

  const subscriptions = await tx.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  const subscriptionsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const list = subscriptionsByUser.get(sub.userId) ?? [];
    list.push(sub);
    subscriptionsByUser.set(sub.userId, list);
  }

  await Promise.all(
    targets.map(async (target) => {
      const subs = subscriptionsByUser.get(target.userId);
      if (!subs || subs.length === 0) return;

      await Promise.all(
        subs.map(async (sub) => {
          const keys = sub.keys as unknown as {
            p256dh: string;
            auth: string;
          };
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, keys },
            {
              title: target.candidate.title,
              body: target.candidate.body,
              type: target.candidate.type,
              data: target.candidate.data,
            },
          );
          if (result === "stale") {
            await deletePushSubscriptionByEndpoint(tx, sub.endpoint);
          }
        }),
      );
    }),
  );
};

/**
 * Persists `targets` (deduped) and, for premium accounts, mirrors the newly
 * created ones as web push. In-app creation is never gated by entitlements —
 * only the push mirroring step checks `isPremium`, matching
 * `canUsePushNotifications` (push subscriptions can only exist for premium
 * accounts in the first place, but this is a defense-in-depth check against
 * a since-downgraded account with stale subscriptions).
 */
const createAndPushNotifications = async (
  tx: NotificationPrisma,
  accountId: string,
  targets: readonly NotificationTarget[],
): Promise<NotificationTarget[]> => {
  const created = await createDedupedNotifications(tx, targets);
  if (created.length === 0) return created;

  const account = await getAccountEntitlements(tx, accountId);
  if (isPremium(account)) {
    await sendPushForTargets(tx, created);
  }

  return created;
};

// ---------------------------------------------------------------------------
// Trigger (a) + (b): evaluated together per account, since both only apply
// to that account's ACTIVE budgets. Called from the cron route
// (src/app/api/cron/recurring/route.ts) alongside recurring posting.
// ---------------------------------------------------------------------------

interface NotifiableMember {
  userId: string;
  categoryThreshold: boolean;
  budgetPeriodEnding: boolean;
}

const getNotifiableMembers = async (
  tx: Pick<PrismaClientTx, "accountUser">,
  accountId: string,
): Promise<NotifiableMember[]> => {
  const accountUsers = await tx.accountUser.findMany({
    where: { accountId },
    select: { user: { select: { id: true, notificationSettings: true } } },
  });

  return accountUsers.map(({ user }) => {
    const settings = parseNotificationSettings(user.notificationSettings);
    return {
      userId: user.id,
      categoryThreshold: settings.categoryThreshold,
      budgetPeriodEnding: settings.budgetPeriodEnding,
    };
  });
};

/**
 * Evaluates triggers (a) "category >= 90% of its allocation" and (b)
 * "budget period ends within 3 days" for every ACTIVE budget on the account,
 * fans matching candidates out to every member with that trigger enabled,
 * and persists (deduped) + pushes (premium) the result.
 *
 * No-ops entirely (before touching any budget data) when the account has the
 * `notifications` feature toggle off — that's the master switch a household
 * admin controls from Settings → Features, and it overrides every per-user
 * trigger preference below it.
 */
export const evaluateBudgetNotificationsForAccount = async (
  tx: NotificationPrisma,
  accountId: string,
  now: Date = new Date(),
): Promise<NotificationTarget[]> => {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { featureSettings: true },
  });
  if (!account) return [];

  const featureSettings = parseFeatureSettings(account.featureSettings);
  if (!featureSettings.notifications) return [];

  const members = await getNotifiableMembers(tx, accountId);
  if (members.length === 0) return [];

  const budgets = await tx.budget.findMany({
    where: { accountId, deleted: null, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      endAt: true,
      categories: {
        where: { deleted: null },
        select: {
          id: true,
          name: true,
          allocatedAmount: true,
          transactions: {
            where: { deleted: null },
            select: {
              transactionType: true,
              amount: true,
              cardId: true,
              createdAt: true,
              occurredAt: true,
            },
          },
          transactionSplits: {
            where: { transaction: { deleted: null } },
            select: {
              amount: true,
              transaction: {
                select: {
                  transactionType: true,
                  amount: true,
                  cardId: true,
                  createdAt: true,
                  occurredAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const categoryThresholdCandidates: NotificationCandidate[] = [];
  const periodEndingCandidates: NotificationCandidate[] = [];

  for (const budget of budgets) {
    const periodEnding = evaluateBudgetPeriodEnding({
      budgetId: budget.id,
      budgetName: budget.name,
      endAt: budget.endAt,
      now,
    });
    if (periodEnding) periodEndingCandidates.push(periodEnding);

    for (const category of budget.categories) {
      const spent = calculateCategorySpent(category);
      const thresholdCandidate = evaluateCategoryThreshold({
        categoryId: category.id,
        categoryName: category.name,
        budgetId: budget.id,
        allocatedAmount: category.allocatedAmount,
        spent,
      });
      if (thresholdCandidate) {
        categoryThresholdCandidates.push(thresholdCandidate);
      }
    }
  }

  const targets: NotificationTarget[] = [];
  for (const member of members) {
    if (member.categoryThreshold) {
      for (const candidate of categoryThresholdCandidates) {
        targets.push({ userId: member.userId, candidate });
      }
    }
    if (member.budgetPeriodEnding) {
      for (const candidate of periodEndingCandidates) {
        targets.push({ userId: member.userId, candidate });
      }
    }
  }

  return createAndPushNotifications(tx, accountId, targets);
};

// ---------------------------------------------------------------------------
// Trigger (c): a recurring transaction was posted. Fired inline from
// `postDueOccurrencesForTemplate` (lib/api-services/recurring.ts) right
// after the `Transaction` row is created, scoped to that template's owner
// (the account member who created the recurring transaction) rather than
// every account member — it's their template posting, not a shared event.
// ---------------------------------------------------------------------------

export const notifyRecurringPosted = async (
  tx: NotificationPrisma,
  accountId: string,
  userId: string,
  candidate: NotificationCandidate,
): Promise<void> => {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { featureSettings: true },
  });
  if (
    !account ||
    !parseFeatureSettings(account.featureSettings).notifications
  ) {
    return;
  }

  const userSettings = await tx.accountUser.findFirst({
    where: { accountId, userId },
    select: { user: { select: { notificationSettings: true } } },
  });
  if (!userSettings) return;

  const settings = parseNotificationSettings(
    userSettings.user.notificationSettings,
  );
  if (!settings.recurringPosted) return;

  await createAndPushNotifications(tx, accountId, [{ userId, candidate }]);
};
