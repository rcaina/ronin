import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { duplicateBudgetWithCards } from "@/lib/api-services/budgets";
import { createBudgetWithCardsSchema } from "@/lib/api-schemas/budgets";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { HttpError } from "@/lib/errors";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canCreateBudget } from "@/lib/utils/entitlements";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new HttpError("Invalid request body", 400);
      }

      const validatedResult = createBudgetWithCardsSchema.safeParse(body);

      if (!validatedResult.success) {
        throw new HttpError("Invalid request body", 400, validatedResult.error);
      }

      const account = await getAccountEntitlements(prisma, user.accountId);
      const activeBudgetCount = await prisma.budget.count({
        where: { accountId: user.accountId, deleted: null, status: "ACTIVE" },
      });
      const entitlementCheck = canCreateBudget(account, activeBudgetCount);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      return prisma.$transaction(async (tx) => {
        const result = await duplicateBudgetWithCards(
          tx,
          validatedResult.data,
          user,
        );
        return NextResponse.json(result, { status: 201 });
      });
    },
  ),
});
