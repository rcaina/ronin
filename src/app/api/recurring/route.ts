import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { createRecurringTransactionSchema } from "@/lib/api-schemas/recurring";
import {
  getRecurringTransactions,
  createRecurringTransaction,
} from "@/lib/api-services/recurring";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canCreateRecurring } from "@/lib/utils/entitlements";

// Free accounts may still view their existing recurring templates (e.g.
// after downgrading) — only creation is gated, in POST below.
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const templates = await prisma.$transaction((tx) =>
        getRecurringTransactions(tx, user.accountId),
      );
      return NextResponse.json(templates, { status: 200 });
    },
  ),
});

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const parsed = createRecurringTransactionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const account = await getAccountEntitlements(prisma, user.accountId);
      const currentCount = await prisma.recurringTransaction.count({
        where: { accountId: user.accountId, deleted: null },
      });
      const entitlementCheck = canCreateRecurring(account, currentCount);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      const template = await prisma.$transaction((tx) =>
        createRecurringTransaction(tx, parsed.data, user),
      );
      return NextResponse.json(template, { status: 201 });
    },
  ),
});
