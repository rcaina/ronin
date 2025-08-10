import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { updateBudgetCategorySchema } from "@/lib/api-schemas/budget-categories";
import { ensureBudgetOwnership, validateBudgetId, validateCategoryId } from "@/lib/utils/auth";
import { deleteBudgetCategory, updateBudgetCategory } from "@/lib/api-services/budgets";

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id, categoryId: catId } = await context.params;
    const budgetId = validateBudgetId(id);
    const categoryId = validateCategoryId(catId);
    await ensureBudgetOwnership(budgetId, user.accountId);

    const body = await req.json() as unknown;
    const validationResult = updateBudgetCategorySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const budgetCategory = await updateBudgetCategory(tx, budgetId, categoryId, validationResult.data, user);
      
      return NextResponse.json(budgetCategory, { status: 200 });
    });


  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id, categoryId: catId } = await context.params;
    const budgetId = validateBudgetId(id);
    const categoryId = validateCategoryId(catId);
    await ensureBudgetOwnership(budgetId, user.accountId);

    return await prisma.$transaction(async (tx) => {
      const budgetCategory = await deleteBudgetCategory(tx, budgetId, categoryId, user);

      return NextResponse.json(budgetCategory, { status: 200 });
    });
  
  }),
}); 