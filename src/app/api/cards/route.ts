import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createCardSchema } from "@/lib/api-schemas/cards";
import { ensureAccountOwnership } from "@/lib/ownership";
import { type User, type CardType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withUser({
  GET: withUserErrorHandling(async (_req: NextRequest, _context, user: User & { accountId: string }) => {
    // Get all users in the same account
    const accountUsers = await prisma.accountUser.findMany({
      where: {
        accountId: user.accountId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = accountUsers.map(au => au.userId);

    const cards = await prisma.card.findMany({
      where: {
        userId: {
          in: userIds,
        },
        deleted: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        transactions: {
          where: {
            deleted: null,
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate amountSpent for each card by summing related transactions
    const cardsWithAmountSpent = cards.map(card => ({
      ...card,
      amountSpent: card.transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      transactions: undefined, // Remove transactions from response
    }));

    return NextResponse.json(cardsWithAmountSpent, { status: 200 });
  }),
});

export const POST = withUser({
  POST: withUserErrorHandling(async (req: NextRequest, _context, user: User & { accountId: string }) => {
    const body = await req.json() as unknown;
    const validationResult = createCardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }
    const { name, cardType, spendingLimit, userId } = validationResult.data;
    
    // Verify the user belongs to the same account
    const ownershipError = await ensureAccountOwnership(user, userId);
    if (ownershipError) {
      return ownershipError;
    }

    const card = await prisma.card.create({
      data: {
        name,
        cardType: cardType as CardType,
        spendingLimit,
        userId,
      },
    });
    return NextResponse.json(card, { status: 201 });
  }),
});