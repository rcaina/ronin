import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { updateBudgetIncome, createIncome } from "@/lib/api-services/income";
import { updateIncomeSchema, createIncomeSchema } from "@/lib/api-schemas/income";
import type { User } from "@prisma/client";
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const budgetId = validateBudgetId(id);
    await ensureBudgetOwnership(budgetId, user.accountId);

    const body = await req.json() as unknown;
    const validationResult = updateIncomeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const result = await updateBudgetIncome(tx, budgetId, validationResult.data, user);
      
      return NextResponse.json(result, { status: 200 });
    });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const budgetId = validateBudgetId(id);
    await ensureBudgetOwnership(budgetId, user.accountId);

    const body = await req.json() as unknown;
    const validationResult = createIncomeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const income = await createIncome(tx, budgetId, validationResult.data, user);

      return NextResponse.json(income, { status: 201 });
    });
  }),
}); 