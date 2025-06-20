import { withUser } from "@/lib/middleware/withUser"
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling"
import prisma from "@/lib/prisma"
import type { User } from "@prisma/client"
import { type NextRequest, NextResponse } from "next/server"

export const GET = withUser({
    GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
        const categories = await prisma.category.findMany({
            where: {
                deleted: null,
            },
            orderBy: {
                name: 'asc',
            },
        })
  
        return NextResponse.json(categories, { status: 200 })
    }),
}) 