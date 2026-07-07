import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
  getSavingsById,
  getPockets,
  getPocketLockedIds,
} from "@/lib/api-services/savings";
import {
  ensureSavingsAccountOwnership,
  validateSavingsId,
} from "@/lib/utils/auth";
import { toSavingsSummary } from "@/lib/transformers/savings";
import type { SavingsWithRelationsLite } from "@/lib/transformers/savings";
import { getAccountEntitlements } from "@/lib/api-services/entitlements";

export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;
      const savingsId = validateSavingsId(id);
      await ensureSavingsAccountOwnership(savingsId, user.accountId);

      return await prisma.$transaction(async (tx) => {
        const savings = await getSavingsById(tx, savingsId, user.accountId);

        if (!savings) {
          return NextResponse.json(
            { message: "Savings account not found" },
            { status: 404 },
          );
        }

        // Lock state is determined across ALL of the account's pockets, not
        // just those in this savings account.
        const allPockets = await getPockets(tx, user.accountId);
        const account = await getAccountEntitlements(tx, user.accountId);
        const lockedIds = getPocketLockedIds(account, allPockets);

        return NextResponse.json(
          toSavingsSummary(
            savings as unknown as SavingsWithRelationsLite,
            lockedIds,
          ),
          { status: 200 },
        );
      });
    },
  ),
});
