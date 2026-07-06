import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors";
import {
  isBudgetLocked,
  isPocketLocked,
  isPremium,
  type AccountEntitlementFields,
} from "../utils/entitlements";

/**
 * Loads the subset of `Account` fields needed for entitlement checks
 * (`isPremium`/`canCreate*`/`canInviteMember`/`canScanReceipt`). Throws a 404
 * `HttpError` if the account doesn't exist, mirroring the ownership-check
 * helpers in `lib/utils/auth.ts`.
 */
export const getAccountEntitlements = async (
  prisma: Pick<PrismaClient, "account">,
  accountId: string,
): Promise<AccountEntitlementFields> => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      plan: true,
      complimentaryAccess: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  });

  if (!account) {
    throw new HttpError("Account not found", 404);
  }

  return account;
};

/**
 * Standard denial response for a blocked entitlement check: HTTP 402 with
 * `{ error: reason, upgradeRequired: true }` so the client can distinguish a
 * paywall from a generic failure. Return this directly from the route
 * handler — `withUserErrorHandling`'s `HttpError` serialization produces a
 * `{ error, details }` shape, not this one, so it can't be reused here.
 */
export const paymentRequired = (reason: string): NextResponse =>
  NextResponse.json({ error: reason, upgradeRequired: true }, { status: 402 });

/**
 * Shared paywall copy for a write blocked because the budget is locked after a
 * downgrade. Pass to `paymentRequired` from the route handler.
 */
export const BUDGET_LOCKED_REASON =
  "This budget is locked because your account is over the Free plan limit. Upgrade to Premium to edit it.";

/**
 * Shared paywall copy for a write blocked because recurring transactions are
 * view-only on the Free plan (e.g. templates kept read-only after a
 * downgrade). Pass to `paymentRequired` from the route handler.
 */
export const RECURRING_LOCKED_REASON =
  "Recurring transactions are read-only on the Free plan. Upgrade to Premium to manage them.";

/**
 * Shared paywall copy for a write blocked because the savings pocket is locked
 * after a downgrade. Pass to `paymentRequired` from the route handler.
 */
export const POCKET_LOCKED_REASON =
  "This savings pocket is locked because your account is over the Free plan limit. Upgrade to Premium to edit it.";

/**
 * Whether a write to `budgetId` must be blocked because the budget is locked
 * (read-only) under the account's current entitlements.
 *
 * Route handlers should call this before mutating a budget and, when it returns
 * `true`, `return paymentRequired(BUDGET_LOCKED_REASON)` themselves — throwing
 * would be serialized by `withUserErrorHandling` as `{ error, details }`, not
 * the `{ error, upgradeRequired }` 402 shape the client expects.
 *
 * Returns `false` for premium (or comped) accounts and for budgets that don't
 * exist (ownership/404 checks live elsewhere — we don't double-handle here).
 */
export const isBudgetWriteLocked = async (
  prisma: Pick<PrismaClient, "account" | "budget">,
  accountId: string,
  budgetId: string,
): Promise<boolean> => {
  const account = await getAccountEntitlements(prisma, accountId);
  if (isPremium(account)) return false;

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, accountId, deleted: null },
    select: { id: true, status: true, createdAt: true },
  });
  if (!budget) return false;

  const activeBudgets = await prisma.budget.findMany({
    where: { accountId, deleted: null, status: "ACTIVE" },
    select: { id: true, createdAt: true },
  });

  return isBudgetLocked(account, budget, activeBudgets);
};

/**
 * Whether a write to `pocketId` must be blocked because the pocket is locked
 * (read-only) under the account's current entitlements. See
 * `isBudgetWriteLocked` for the recommended route-handler usage.
 *
 * Returns `false` for premium (or comped) accounts and for pockets that don't
 * exist within the account (ownership/404 checks live elsewhere).
 */
export const isPocketWriteLocked = async (
  prisma: Pick<PrismaClient, "account" | "pocket">,
  accountId: string,
  pocketId: string,
): Promise<boolean> => {
  const account = await getAccountEntitlements(prisma, accountId);
  if (isPremium(account)) return false;

  const pocket = await prisma.pocket.findFirst({
    where: {
      id: pocketId,
      savings: { accountId, deleted: null },
      deleted: null,
    },
    select: { id: true, createdAt: true },
  });
  if (!pocket) return false;

  const allPockets = await prisma.pocket.findMany({
    where: { savings: { accountId, deleted: null }, deleted: null },
    select: { id: true, createdAt: true },
  });

  return isPocketLocked(account, pocket, allPockets);
};
