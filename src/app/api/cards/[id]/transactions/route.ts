import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { ensureCardAccountOwnership, validateCardId } from "@/lib/utils/auth";
import { getCardTransactions } from "@/lib/api-services/cards";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const cardId = validateCardId(id);
    await ensureCardAccountOwnership(cardId, user.accountId);
    
    return await prisma.$transaction(async (tx) => {
      const cardTransactions = await getCardTransactions(tx, cardId);
      return NextResponse.json(cardTransactions , { status: 200 });
    });
  }),
}); 