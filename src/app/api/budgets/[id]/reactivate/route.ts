import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { reactivateBudget } from "@/lib/api-services/budgets";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canCreateBudget } from "@/lib/utils/entitlements";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;
      const budgetId = validateBudgetId(id);
      await ensureBudgetOwnership(budgetId, user.accountId);

      const account = await getAccountEntitlements(prisma, user.accountId);
      const activeBudgetCount = await prisma.budget.count({
        where: { accountId: user.accountId, deleted: null, status: "ACTIVE" },
      });
      const entitlementCheck = canCreateBudget(account, activeBudgetCount);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      return await prisma.$transaction(async (tx) => {
        await reactivateBudget(tx, budgetId, user);

        return NextResponse.json({ success: true }, { status: 200 });
      });
    },
  ),
});
