import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import { markBudgetArchived } from "@/lib/api-services/budgets"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const POST = withUser({
    POST: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        
        if (!id) {
            return NextResponse.json({ error: "Budget ID is required" }, { status: 400 });
        }
        
        await prisma.$transaction(async (tx) => {
            await markBudgetArchived(tx, id, user);
        });
        
        return NextResponse.json({ success: true });
    })
}) 