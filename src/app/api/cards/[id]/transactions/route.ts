import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { ensureAccountOwnership } from "@/lib/ownership";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Card ID is required" }, { status: 400 });
    }

    // First, find the card and verify it belongs to a user in the same account
    const card = await prisma.card.findFirst({
      where: {
        id,
        deleted: null,
      },
      select: {
        userId: true,
      },
    });

    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    // Verify the card belongs to a user in the same account
    const ownershipError = await ensureAccountOwnership(user, card.userId);
    if (ownershipError) {
      return ownershipError;
    }

    // Get all transactions for this card
    const transactions = await prisma.transaction.findMany({
      where: {
        cardId: id,
        deleted: null,
      },
      include: {
        category: {
          include: {
            category: true,
          },
        },
        Budget: true,
        card: {
          select: {
            id: true,
            name: true,
            cardType: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transactions, { status: 200 });
  }),
}); 