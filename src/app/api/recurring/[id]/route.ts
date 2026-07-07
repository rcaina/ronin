import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { updateRecurringTransactionSchema } from "@/lib/api-schemas/recurring";
import {
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "@/lib/api-services/recurring";
import {
  getAccountEntitlements,
  paymentRequired,
  RECURRING_LOCKED_REASON,
} from "@/lib/api-services/entitlements";
import { isPremium } from "@/lib/utils/entitlements";

// Recurring transactions are view-only on the Free plan — this covers
// editing fields, pausing/resuming (via `paused` in the body), and deleting.
// Templates a downgraded account already had stay visible in GET, just
// read-only, until the account is premium again.
export const PATCH = withUser({
  PATCH: withUserErrorHandling(
    async (
      req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;
      const body = (await req.json()) as unknown;
      const parsed = updateRecurringTransactionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const account = await getAccountEntitlements(prisma, user.accountId);
      if (!isPremium(account)) {
        return paymentRequired(RECURRING_LOCKED_REASON);
      }

      const template = await prisma.$transaction((tx) =>
        updateRecurringTransaction(tx, id!, parsed.data, user),
      );
      return NextResponse.json(template, { status: 200 });
    },
  ),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(
    async (
      _req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;

      const account = await getAccountEntitlements(prisma, user.accountId);
      if (!isPremium(account)) {
        return paymentRequired(RECURRING_LOCKED_REASON);
      }

      await prisma.$transaction((tx) =>
        deleteRecurringTransaction(tx, id!, user),
      );
      return NextResponse.json({ success: true }, { status: 200 });
    },
  ),
});
