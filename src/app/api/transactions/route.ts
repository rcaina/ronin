import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { getTransactions } from "@/lib/api-services/transactions";
import type { User } from "@prisma/client";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const transactions = await getTransactions(prisma, user.accountId);
    return NextResponse.json(transactions, { status: 200 });
  }),
}); 