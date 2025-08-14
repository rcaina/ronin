import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth";
import { getBudgetCards } from "@/lib/api-services/budgets";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const budgetId = validateBudgetId(id);
    await ensureBudgetOwnership(budgetId, user.accountId);
    
    const budgetCards = await getBudgetCards(prisma, budgetId);
    
    return NextResponse.json(budgetCards, { status: 200 });
  })
});