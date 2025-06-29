import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { createBudget, getBudgets } from "@/lib/api-services/budgets"
import { createBudgetSchema } from "@/lib/api-schemas/budgets"
import { type User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        console.log('Budgets API called:', {
            userId: user.id,
            accountId: user.accountId,
            email: user.email
        });
        
        const budgets = await getBudgets(prisma, user.accountId)
        
        console.log('Budgets API response:', {
            budgetCount: budgets.length,
            budgetIds: budgets.map(b => b.id)
        });
        
        return NextResponse.json(budgets, { status: 200 })
    }),
})

export const POST = withUser({
    POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const body = await req.json() as unknown;
        const validationResult = createBudgetSchema.safeParse(body);
        
        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Validation failed", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        try {
            const budget = await prisma.$transaction(async (tx) => await createBudget(tx, validationResult.data, user))

            return NextResponse.json(
                { message: 'Budget created successfully', budget },
                { status: 201 }
            )
        } catch (error) {
            console.error("Error creating budget:", error);
            return NextResponse.json(
                { message: "Failed to create budget" },
                { status: 500 }
            );
        }
    }),
})