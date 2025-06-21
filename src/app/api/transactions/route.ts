import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: user.accountId,
        deleted: null,
      },
      include: {
        category: true,
        Budget: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transactions, { status: 200 });
  }),
}); 