import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createTransactionsBatch } from "@/lib/api-services/transactions";
import { createTransactionsBatchSchema } from "@/lib/api-schemas/transactions";
import type { User } from "@prisma/client";
import {
  BUDGET_LOCKED_REASON,
  getAccountEntitlements,
  isBudgetWriteLocked,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canSplitTransactions } from "@/lib/utils/entitlements";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = createTransactionsBatchSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      if (
        validationResult.data.transactions.some(
          (t) => t.splits && t.splits.length > 0,
        )
      ) {
        const account = await getAccountEntitlements(prisma, user.accountId);
        const entitlementCheck = canSplitTransactions(account);
        if (!entitlementCheck.allowed) {
          return paymentRequired(entitlementCheck.reason);
        }
      }

      const budgetIds = [
        ...new Set(validationResult.data.transactions.map((t) => t.budgetId)),
      ];
      for (const budgetId of budgetIds) {
        if (await isBudgetWriteLocked(prisma, user.accountId, budgetId)) {
          return paymentRequired(BUDGET_LOCKED_REASON);
        }
      }

      return await prisma.$transaction(async (tx) => {
        const transactions = await createTransactionsBatch(
          tx,
          validationResult.data,
          user,
        );

        return NextResponse.json({ transactions }, { status: 200 });
      });
    },
  ),
});
