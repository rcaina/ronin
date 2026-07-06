import type { Account } from "@prisma/client";

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
