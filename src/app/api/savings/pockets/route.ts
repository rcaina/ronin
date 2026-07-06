import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { createPocketSchema } from "@/lib/api-schemas/savings";
import {
  createPocket,
  getPockets,
  getPocketLockedIds,
} from "@/lib/api-services/savings";
import {
  toPocketSummary,
  toPocketSummaryList,
} from "@/lib/transformers/savings";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canCreatePocket } from "@/lib/utils/entitlements";

export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { searchParams } = new URL(req.url);
      const savingsId = searchParams.get("savingsId");

      const { pockets, allPockets, account } = await prisma.$transaction(
        async (tx) => {
          const pockets = await getPockets(
            tx,
            user.accountId,
            savingsId ?? undefined,
          );
          // Lock state is determined across ALL of the account's pockets,
          // independent of the optional savingsId filter.
          const allPockets = savingsId
            ? await getPockets(tx, user.accountId)
            : pockets;
          const account = await getAccountEntitlements(tx, user.accountId);
          return { pockets, allPockets, account };
        },
      );

      const lockedIds = getPocketLockedIds(account, allPockets);
      return NextResponse.json(toPocketSummaryList(pockets, lockedIds), {
        status: 200,
      });
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
      const parsed = createPocketSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const account = await getAccountEntitlements(prisma, user.accountId);
      const currentPocketCount = await prisma.pocket.count({
        where: {
          deleted: null,
          savings: { accountId: user.accountId, deleted: null },
        },
      });
      const entitlementCheck = canCreatePocket(account, currentPocketCount);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      const pocket = await prisma.$transaction((tx) =>
        createPocket(tx, parsed.data, user),
      );
      if (!pocket)
        return NextResponse.json(
          { message: "Savings account not found" },
          { status: 404 },
        );

      return NextResponse.json(toPocketSummary(pocket), { status: 201 });
    },
  ),
});
