import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { updateBudget, deleteBudget, getBudgetById } from "@/lib/api-services/budgets"
import { updateBudgetSchema } from "@/lib/api-schemas/budgets"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"
import { ensureBudgetOwnership, validateBudgetId } from "@/lib/utils/auth"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        const budgetId = validateBudgetId(id);
        await ensureBudgetOwnership(budgetId, user.accountId);

        const { searchParams } = req.nextUrl;

        const budget = await getBudgetById(prisma, budgetId, searchParams);

        return NextResponse.json(budget, { status: 200 });
        
    }),
})

export const PUT = withUser({
    PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        const budgetId = validateBudgetId(id);
        await ensureBudgetOwnership(budgetId, user.accountId);

        const body = await req.json() as unknown;
        const validationResult = updateBudgetSchema.safeParse(body);
        
        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        return await prisma.$transaction(async (tx) => {
            const budget = await updateBudget(tx, budgetId, validationResult.data, user);

            return NextResponse.json(
                { message: 'Budget updated successfully', budget },
                { status: 200 }
            );
        });
    }),
})

export const DELETE = withUser({
    DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        const budgetId = validateBudgetId(id);
        await ensureBudgetOwnership(budgetId, user.accountId);

        return await prisma.$transaction(async (tx) => {
            await deleteBudget(tx, budgetId, user);

            return NextResponse.json(
                { message: 'Budget deleted successfully' },
                { status: 200 }
            );
        });
    }),
}) 