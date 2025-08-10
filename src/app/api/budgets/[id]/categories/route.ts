import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { createBudgetCategorySchema } from "@/lib/api-schemas/budget-categories";
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth";
import { createBudgetCategory, getBudgetCategories } from "@/lib/api-services/budgets";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const budgetId = validateBudgetId(id);
    await ensureBudgetOwnership(budgetId, user.accountId);
    
    const budgetCategories = await getBudgetCategories(prisma, budgetId);
    return NextResponse.json(budgetCategories, { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const budgetId = validateBudgetId(id);
    await ensureBudgetOwnership(budgetId, user.accountId);
    
    const body = await req.json() as unknown;
    const validationResult = createBudgetCategorySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const budgetCategory = await createBudgetCategory(tx, budgetId, validationResult.data, user);
      return NextResponse.json(budgetCategory, { status: 201 });
    });
  }),
}); 