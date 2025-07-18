import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { duplicateBudget } from "@/lib/api-services/budgets"
import { type User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const POST = withUser({
    POST: withUserErrorHandling(async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const body = await req.json() as { budgetId: string };
        
        if (!body.budgetId) {
            return NextResponse.json(
                { message: "Budget ID is required" },
                { status: 400 }
            );
        }

        try {
            const duplicatedBudget = await prisma.$transaction(async (tx) => 
                await duplicateBudget(tx, body.budgetId, user)
            );

            return NextResponse.json(
                { message: 'Budget duplicated successfully', budget: duplicatedBudget },
                { status: 201 }
            );
        } catch (error: unknown) {
            console.error("Error duplicating budget:", error);
            return NextResponse.json(
                { message: "Failed to duplicate budget" },
                { status: 500 }
            );
        }
    }),
}) 