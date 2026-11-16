import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { fillBudgetMonthSchema } from "@/lib/api-schemas/budget-categories";
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth";
import {
  fillBudgetMonth,
  previewBudgetMonthFill,
} from "@/lib/api-services/budgets";
import {
  BUDGET_LOCKED_REASON,
  isBudgetWriteLocked,
  paymentRequired,
} from "@/lib/api-services/entitlements";

export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id, month } = await context.params;
      const budgetId = validateBudgetId(id);
      await ensureBudgetOwnership(budgetId, user.accountId);

      const preview = await previewBudgetMonthFill(
        prisma,
        budgetId,
        month ?? "",
      );
      return NextResponse.json(preview, { status: 200 });
    },
  ),
});

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id, month } = await context.params;
      const budgetId = validateBudgetId(id);
      await ensureBudgetOwnership(budgetId, user.accountId);

      if (await isBudgetWriteLocked(prisma, user.accountId, budgetId)) {
        return paymentRequired(BUDGET_LOCKED_REASON);
      }

      const validationResult = fillBudgetMonthSchema.safeParse(
        (await req.json()) as unknown,
      );
      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const result = await prisma.$transaction((tx) =>
        fillBudgetMonth(
          tx,
          budgetId,
          month ?? "",
          validationResult.data.source,
        ),
      );
      return NextResponse.json(result, { status: 200 });
    },
  ),
});
