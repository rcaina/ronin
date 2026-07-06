import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors";
import type { AccountEntitlementFields } from "../utils/entitlements";

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
