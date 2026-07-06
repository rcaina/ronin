import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
  createPushSubscriptionSchema,
  deletePushSubscriptionSchema,
} from "@/lib/api-schemas/push";
import {
  deletePushSubscription,
  upsertPushSubscription,
} from "@/lib/api-services/push";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canUsePushNotifications } from "@/lib/utils/entitlements";

// POST /api/notifications/push — registers a browser's web-push subscription
// for the current user. PREMIUM-gated: free accounts get a 402 with
// `upgradeRequired: true` (never a throw — see paymentRequired) so the
// client can open UpgradeModal instead of a generic error toast. In-app
// notifications are never gated; only push registration is.
export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const parsed = createPushSubscriptionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const account = await getAccountEntitlements(prisma, user.accountId);
      const entitlementCheck = canUsePushNotifications(account);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      const subscription = await prisma.$transaction((tx) =>
        upsertPushSubscription(tx, user.id, parsed.data),
      );
      return NextResponse.json(subscription, { status: 201 });
    },
  ),
});

// DELETE /api/notifications/push — unregisters a subscription. Never gated;
// turning push off is always allowed regardless of plan.
export const DELETE = withUser({
  DELETE: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const parsed = deletePushSubscriptionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      await prisma.$transaction((tx) =>
        deletePushSubscription(tx, user.id, parsed.data.endpoint),
      );
      return NextResponse.json({ success: true }, { status: 200 });
    },
  ),
});
