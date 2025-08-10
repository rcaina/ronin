import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { updateIncome, deleteIncome } from "@/lib/api-services/income";
import { updateSingleIncomeSchema } from "@/lib/api-schemas/income";
import type { User } from "@prisma/client";
import { ensureBudgetOwnership, validateBudgetId, validateIncomeId } from "@/lib/utils/auth";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id, incomeId:incId } = await context.params;
    const budgetId = validateBudgetId(id);
    const incomeId = validateIncomeId(incId);
    await ensureBudgetOwnership(budgetId, user.accountId);

    const body = await req.json() as unknown;
    const validationResult = updateSingleIncomeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const income = await updateIncome(tx, incomeId, budgetId, validationResult.data, user);

      return NextResponse.json(income, { status: 200 });
    });
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id, incomeId: incId } = await context.params;
    const budgetId = validateBudgetId(id);
    const incomeId = validateIncomeId(incId);
    await ensureBudgetOwnership(budgetId, user.accountId);

    return await prisma.$transaction(async (tx) => {
      const income = await deleteIncome(tx, incomeId, budgetId, user);

      return NextResponse.json(income, { status: 200 });
    });
  }),
}); 