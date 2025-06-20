import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const { id } = await context.params;
        
        const budget = await prisma.budget.findFirst({
            where: {
                id,
                accountId: user.accountId,
                deleted: null,
            },
            include: {
                categories: {
                    where: {
                        deleted: null,
                    },
                    include: {
                        category: true,
                    },
                },
            },
        });

        if (!budget) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }

        return NextResponse.json(budget, { status: 200 });
    }),
}) 