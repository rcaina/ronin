import type { NotificationType } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Pure, framework-agnostic trigger-evaluation + dedupe logic for in-app/push
// notifications. Nothing here touches Prisma or the network — see
// `lib/api-services/notifications.ts` for the DB-backed service that calls
// into these helpers (evaluated in the cron route for (a)/(b), inline in the
// recurring-posting service for (c) — see that file's module doc).
// ---------------------------------------------------------------------------

/** A category reaches this share of its allocated amount before it notifies. */
export const CATEGORY_SPEND_THRESHOLD_RATIO = 0.9;

/** A budget period notifies once it's this many days (or fewer) from ending. */
export const BUDGET_PERIOD_ENDING_WINDOW_DAYS = 3;

/**
 * A notification ready to persist, minus the `userId` it targets (a single
 * candidate is often fanned out to every account member — see
 * `NotificationTarget`). `dedupeKey` is the stable event-identity: the same
 * underlying event always derives the same key, so re-evaluating an
 * already-notified event is a safe no-op (see `dedupeNotificationTargets`
 * and the `(userId, dedupeKey)` unique index on `Notification`).
 */
export interface NotificationCandidate {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  dedupeKey: string;
}

/** Joins a type with its identifying parts into a stable, human-readable key. */
const buildDedupeKey = (type: NotificationType, ...parts: string[]): string =>
  [type, ...parts].join(":");

// ---------------------------------------------------------------------------
// Trigger (a): a category has reached >= 90% of its allocated amount.
// ---------------------------------------------------------------------------

export interface CategoryThresholdInput {
  categoryId: string;
  categoryName: string;
  budgetId: string;
  /** Category.allocatedAmount — nullable/absent categories never trigger. */
  allocatedAmount: number | null | undefined;
  /** Spend for this category, as computed by `calculateCategorySpent`. */
  spent: number;
}

/**
 * Fires once a category's spend reaches `CATEGORY_SPEND_THRESHOLD_RATIO` of
 * its allocated amount. Returns `null` when the category has no (or a
 * non-positive) allocation, or spend hasn't reached the threshold yet.
 *
 * The dedupe key is scoped to the category alone (not the budget too)
 * because a `Category` row already belongs to a single budget period — once
 * that budget ends the category is never re-evaluated, so no separate period
 * identifier is needed to keep the key unique across periods.
 */
export const evaluateCategoryThreshold = (
  input: CategoryThresholdInput,
): NotificationCandidate | null => {
  const allocated = input.allocatedAmount;
  if (allocated == null || allocated <= 0) return null;
  if (input.spent / allocated < CATEGORY_SPEND_THRESHOLD_RATIO) return null;

  const percent = Math.round((input.spent / allocated) * 100);

  return {
    type: "CATEGORY_OVER_THRESHOLD",
    title: `${input.categoryName} is nearing its budget`,
    body: `You've used ${percent}% of the ${formatCurrency(allocated)} allocated to ${input.categoryName}.`,
    data: { categoryId: input.categoryId, budgetId: input.budgetId },
    dedupeKey: buildDedupeKey("CATEGORY_OVER_THRESHOLD", input.categoryId),
  };
};

// ---------------------------------------------------------------------------
// Trigger (b): a budget period ends within 3 days.
// ---------------------------------------------------------------------------

export interface BudgetPeriodEndingInput {
  budgetId: string;
  budgetName: string;
  endAt: Date;
  now: Date;
}

/**
 * Fires once a budget's `endAt` is within `BUDGET_PERIOD_ENDING_WINDOW_DAYS`
 * days of `now` (inclusive), but not after it has already ended — a budget
 * that already ended is handled by the budget-status lifecycle, not this
 * notification. The dedupe key is scoped to the budget alone: a given
 * `Budget` row has exactly one `endAt`, so it can only ever enter the window
 * once.
 */
export const evaluateBudgetPeriodEnding = (
  input: BudgetPeriodEndingInput,
): NotificationCandidate | null => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilEnd = (input.endAt.getTime() - input.now.getTime()) / msPerDay;

  if (daysUntilEnd < 0 || daysUntilEnd > BUDGET_PERIOD_ENDING_WINDOW_DAYS) {
    return null;
  }

  return {
    type: "BUDGET_PERIOD_ENDING",
    title: `${input.budgetName} ends soon`,
    body: `Your budget period ends on ${input.endAt.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      },
    )}.`,
    data: { budgetId: input.budgetId },
    dedupeKey: buildDedupeKey("BUDGET_PERIOD_ENDING", input.budgetId),
  };
};

// ---------------------------------------------------------------------------
// Trigger (c): a recurring transaction was posted.
// ---------------------------------------------------------------------------

export interface RecurringPostedInput {
  recurringTransactionId: string;
  name: string | null | undefined;
  amount: number;
  occurredAt: Date;
}

/**
 * Always fires (posting is itself the event) — dedupe is what keeps it to
 * once per occurrence: the key includes both the template id and the
 * occurrence date, matching the `(recurringTransactionId, occurredAt)`
 * uniqueness the posting engine already guarantees for the `Transaction`
 * row itself (see `lib/utils/recurring.ts`).
 */
export const evaluateRecurringPosted = (
  input: RecurringPostedInput,
): NotificationCandidate => {
  const trimmedName = input.name?.trim();
  const displayName =
    trimmedName && trimmedName.length > 0
      ? trimmedName
      : "A recurring transaction";

  return {
    type: "RECURRING_POSTED",
    title: "Recurring transaction posted",
    body: `${displayName} for ${formatCurrency(input.amount)} was posted.`,
    data: {
      recurringTransactionId: input.recurringTransactionId,
      occurredAt: input.occurredAt.toISOString(),
    },
    dedupeKey: buildDedupeKey(
      "RECURRING_POSTED",
      input.recurringTransactionId,
      input.occurredAt.toISOString(),
    ),
  };
};

// ---------------------------------------------------------------------------
// Dedupe: fanning a candidate out to users, then filtering out anything
// already notified.
// ---------------------------------------------------------------------------

/** A candidate notification aimed at a specific user. */
export interface NotificationTarget {
  userId: string;
  candidate: NotificationCandidate;
}

/**
 * The identity of a (user, event) pair — matches the `(userId, dedupeKey)`
 * unique index on `Notification`. Two targets with the same identity key
 * represent the same notification and must collapse to one.
 */
export const notificationIdentityKey = (
  target: Pick<NotificationTarget, "userId" | "candidate">,
): string => `${target.userId}:${target.candidate.dedupeKey}`;

/**
 * Filters `targets` down to the ones that haven't already fired, given the
 * identity keys (`notificationIdentityKey`) of notifications that already
 * exist (typically loaded from the DB for just these users/keys — see
 * `lib/api-services/notifications.ts`). Also collapses duplicate targets
 * within the same batch, so a caller that (for example) evaluates the same
 * category twice in one pass never double-submits it.
 *
 * Pure and order-preserving; the DB's unique index remains the ultimate
 * backstop against a race between two concurrent evaluations.
 */
export const dedupeNotificationTargets = (
  targets: readonly NotificationTarget[],
  existingIdentityKeys: ReadonlySet<string>,
): NotificationTarget[] => {
  const seen = new Set(existingIdentityKeys);
  const result: NotificationTarget[] = [];

  for (const target of targets) {
    const key = notificationIdentityKey(target);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(target);
  }

  return result;
};
