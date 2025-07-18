import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { createBudget, getBudgets } from "@/lib/api-services/budgets"
import { createBudgetSchema } from "@/lib/api-schemas/budgets"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | null;
        const excludeCardPayments = searchParams.get('excludeCardPayments') === 'true';
        
        const budgets = await getBudgets(prisma, user.accountId, status ?? undefined, excludeCardPayments);
        
        return NextResponse.json(budgets);
    })
})

export const POST = withUser({
    POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const body = await req.json() as { name: string, description: string, amount: number, startDate: Date, endDate: Date };
        const validatedData = createBudgetSchema.parse(body);
        
        const budget = await prisma.$transaction(async (tx) => {
            return await createBudget(tx, validatedData, user);
        });
        
        return NextResponse.json(budget, { status: 201 });
    })
})