import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { createBudget, getBudgets } from "@/lib/api-services/budgets"
import { createBudgetSchema } from "@/lib/api-schemas/budgets"
import type { BudgetStatus, User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"
import { HttpError } from "@/lib/errors"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { searchParams } = req.nextUrl
        const status = searchParams.get('status') as BudgetStatus | undefined;
        const excludeCardPayments = searchParams.get('excludeCardPayments') === 'true';
        
        const budgets = await getBudgets(prisma, user.accountId, status, excludeCardPayments);
        
        // Ensure we always return an array, even if budgets is null/undefined
        return NextResponse.json(Array.isArray(budgets) ? budgets : [], { status: 200 });
    })
})

export const POST = withUser({
    POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const body = await req.json() as unknown;
        const validatedResult = createBudgetSchema.safeParse(body);

        if (!validatedResult.success) {
            throw new HttpError('Invalid request body', 400, validatedResult.error);
        }
        
        return await prisma.$transaction(async (tx) => {
            const budget = await createBudget(tx, validatedResult.data, user);
            
            return NextResponse.json({message: 'Budget created successfully', budget}, { status: 201 });
        });
    })
})