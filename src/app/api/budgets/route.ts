import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Record<string, string> }, user: User) => {
        const budgets = await prisma.budget.findMany({
            where: {
                accountId: user.accountId,
                deleted: false,
            },
            include: {
                categories: true,
            },
        })
  
        return NextResponse.json(budgets, { status: 200 })
    }),
})