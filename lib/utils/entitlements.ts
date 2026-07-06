import type { Account, BudgetStatus } from "@prisma/client";

/**
 * Minimal account shape needed for entitlement checks. Compatible
 * structurally with the Prisma `Account` model and any serialized
 * subset of it returned by the API.
 */
export type AccountEntitlementFields = Pick<
  Account,
  "plan" | "complimentaryAccess" | "subscriptionStatus" | "currentPeriodEnd"
>;

/** Free-tier limits, enforced server-side (see `lib/utils/entitlements.ts` callers). */
export const FREE_LIMITS = {
  maxActiveBudgets: 1,
  maxMembers: 1,
  maxPockets: 3,
  aiReceiptScanning: false,
  maxRecurringTransactions: 0,
} as const;

/** Shared shape for every entitlement check below. */
export type CheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Whether an account currently has premium access.
 *
 * `complimentaryAccess` is checked first — comped accounts bypass every
 * other check, and Stripe webhooks never touch this field, so a comp can't
 * be clobbered by subscription sync.
 *
 * Otherwise premium requires `plan === "PREMIUM"` AND one of:
 * - `subscriptionStatus === "ACTIVE"`
 * - `subscriptionStatus === "PAST_DUE"` (grace period while dunning)
 * - `subscriptionStatus === "CANCELED"` AND `currentPeriodEnd` is still in
 *   the future (paid-through access after cancellation)
 */
export const isPremium = (
  account: AccountEntitlementFields,
  now: Date = new Date(),
): boolean => {
  if (account.complimentaryAccess) return true;

  if (account.plan !== "PREMIUM") return false;

  switch (account.subscriptionStatus) {
    case "ACTIVE":
    case "PAST_DUE":
      return true;
    case "CANCELED":
      return account.currentPeriodEnd != null && account.currentPeriodEnd > now;
    default:
      return false;
  }
};

/**
 * Whether the account may create another active budget. Free accounts are
 * capped at `FREE_LIMITS.maxActiveBudgets`; premium (or comped) accounts are
 * unlimited.
 */
export const canCreateBudget = (
  account: AccountEntitlementFields,
  activeBudgetCount: number,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  if (activeBudgetCount >= FREE_LIMITS.maxActiveBudgets) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${FREE_LIMITS.maxActiveBudgets} active budget. Upgrade to Premium for unlimited budgets.`,
    };
  }

  return { allowed: true };
};

/**
 * Whether the account may invite another member. Free accounts are capped
 * at `FREE_LIMITS.maxMembers`; premium (or comped) accounts are unlimited.
 */
export const canInviteMember = (
  account: AccountEntitlementFields,
  currentMemberCount: number,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  if (currentMemberCount >= FREE_LIMITS.maxMembers) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${FREE_LIMITS.maxMembers} account member. Upgrade to Premium to invite your household.`,
    };
  }

  return { allowed: true };
};

/**
 * Whether the account may use AI receipt scanning. Free accounts can't;
 * premium (or comped) accounts can.
 */
export const canScanReceipt = (
  account: AccountEntitlementFields,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  return {
    allowed: false,
    reason:
      "AI receipt scanning is a Premium feature. Upgrade to Premium to scan receipts.",
  };
};

/**
 * Whether the account may create another savings pocket. Free accounts are
 * capped at `FREE_LIMITS.maxPockets`; premium (or comped) accounts are
 * unlimited.
 */
export const canCreatePocket = (
  account: AccountEntitlementFields,
  currentPocketCount: number,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  if (currentPocketCount >= FREE_LIMITS.maxPockets) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${FREE_LIMITS.maxPockets} savings pockets. Upgrade to Premium for unlimited pockets.`,
    };
  }

  return { allowed: true };
};

/**
 * Whether the account may split a transaction across multiple categories.
 * Free accounts can't; premium (or comped) accounts can.
 */
export const canSplitTransactions = (
  account: AccountEntitlementFields,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  return {
    allowed: false,
    reason:
      "Splitting a transaction across categories is a Premium feature. Upgrade to Premium to split transactions.",
  };
};

/**
 * Whether the account may create another recurring transaction template.
 * Free accounts can't create any (`FREE_LIMITS.maxRecurringTransactions` is
 * 0); premium (or comped) accounts are unlimited. Free accounts may still
 * VIEW templates they already have (e.g. after downgrading) — this check
 * only gates creation, enforced by the CREATE route handler.
 */
export const canCreateRecurring = (
  account: AccountEntitlementFields,
  currentCount: number,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  if (currentCount >= FREE_LIMITS.maxRecurringTransactions) {
    return {
      allowed: false,
      reason:
        "Recurring transactions are a Premium feature. Upgrade to Premium to automate repeating transactions.",
    };
  }

  return { allowed: true };
};

/**
 * Whether the account may view cross-budget report history and date-range
 * comparisons on the `/reports` page. Free accounts see the current active
 * budget's own numbers only (never gated); premium (or comped) accounts
 * unlock history ranges and "this period vs last" comparisons.
 */
export const canViewReportHistory = (
  account: AccountEntitlementFields,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  return {
    allowed: false,
    reason:
      "Cross-budget report history is a Premium feature. Upgrade to Premium to view trends and comparisons beyond your current budget.",
  };
};

/**
 * Whether the account may import transactions from a CSV. Free accounts can't
 * (import is a Premium migration convenience); premium (or comped) accounts
 * can. Exporting to CSV is always free and has no gate.
 */
export const canImportTransactions = (
  account: AccountEntitlementFields,
): CheckResult => {
  if (isPremium(account)) return { allowed: true };

  return {
    allowed: false,
    reason:
      "Importing transactions from a CSV is a Premium feature. Upgrade to Premium to import your data.",
  };
};

// ---------------------------------------------------------------------------
// Downgrade locking
//
// When a paid account downgrades to Free it may hold more resources than the
// free tier allows. We never delete data — instead the NEWEST `limit`
// resources (by `createdAt`, `id` as a stable tiebreak) stay usable and the
// OLDER ones become read-only ("locked"). Premium/comped accounts never lock
// anything.
// ---------------------------------------------------------------------------

/** Minimal orderable shape a lockable resource must expose. */
type LockableItem = { id: string; createdAt: Date };

/**
 * Orders two lockable items newest-first: later `createdAt` wins, with the
 * larger `id` as a stable tiebreak. Used both to sort and to count "newer".
 */
const byNewestFirst = (a: LockableItem, b: LockableItem): number => {
  const diff = b.createdAt.getTime() - a.createdAt.getTime();
  if (diff !== 0) return diff;
  return b.id.localeCompare(a.id);
};

/**
 * The ids of the items that fall BEYOND the newest `limit` (i.e. the ones that
 * lock when an account is on the free tier). Returns an empty set for premium
 * (or comped) accounts — they never lock anything.
 *
 * Items are ordered newest-first by `createdAt` (with `id` as a stable
 * tiebreak); the first `limit` are kept and the rest are returned as locked.
 */
export const lockedIds = <T extends LockableItem>(
  account: AccountEntitlementFields,
  items: readonly T[],
  limit: number,
  now: Date = new Date(),
): Set<string> => {
  if (isPremium(account, now)) return new Set();

  const ordered = [...items].sort(byNewestFirst);
  return new Set(ordered.slice(limit).map((item) => item.id));
};

/**
 * Whether a budget is locked (read-only) for the given account.
 *
 * Only `ACTIVE` budgets can lock — non-active budgets don't count against the
 * active-budget limit and are never locked. An active budget locks when there
 * are at least `FREE_LIMITS.maxActiveBudgets` OTHER active budgets newer than
 * it. Premium (or comped) accounts never lock.
 */
export const isBudgetLocked = (
  account: AccountEntitlementFields,
  budget: { id: string; status: BudgetStatus; createdAt: Date },
  allActiveBudgets: readonly LockableItem[],
  now: Date = new Date(),
): boolean => {
  if (isPremium(account, now)) return false;
  if (budget.status !== "ACTIVE") return false;

  const newerCount = allActiveBudgets.filter(
    (other) => other.id !== budget.id && byNewestFirst(other, budget) < 0,
  ).length;

  return newerCount >= FREE_LIMITS.maxActiveBudgets;
};

/**
 * Whether a savings pocket is locked (read-only) for the given account.
 *
 * A pocket locks when there are at least `FREE_LIMITS.maxPockets` OTHER pockets
 * newer than it. Premium (or comped) accounts never lock.
 */
export const isPocketLocked = (
  account: AccountEntitlementFields,
  pocket: LockableItem,
  allPockets: readonly LockableItem[],
  now: Date = new Date(),
): boolean => {
  if (isPremium(account, now)) return false;

  const newerCount = allPockets.filter(
    (other) => other.id !== pocket.id && byNewestFirst(other, pocket) < 0,
  ).length;

  return newerCount >= FREE_LIMITS.maxPockets;
};
