import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { ensureAccountOwnership } from "@/lib/ownership";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { deleteCard, updateCard } from "@/lib/api-services/cards";
import { z } from "zod";

const updateCardSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cardType: z.enum(["CREDIT", "DEBIT", "CASH", "BUSINESS_CREDIT", "BUSINESS_DEBIT"]).optional(),
  spendingLimit: z.number().min(0).optional(),
  userId: z.string().min(1).optional(),
});

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Card ID is required" }, { status: 400 });
    }

    const card = await prisma.card.findFirst({
      where: {
        id,
        userId: user.id,
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
    });

    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    // Calculate amountSpent by summing related transactions
    const cardWithAmountSpent = {
      ...card,
      amountSpent: card.transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      transactions: undefined, // Remove transactions from response
    };

    return NextResponse.json(cardWithAmountSpent, { status: 200 });
  }),
});

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Card ID is required" }, { status: 400 });
    }

    const body = await req.json() as unknown;
    const validationResult = updateCardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Ensure ownership
    const ownershipError = await ensureAccountOwnership(user, user.id);
    if (ownershipError) {
      return ownershipError;
    }
    
    return await prisma.$transaction(async (tx) => {
      const updatedCard = await updateCard(tx, id, validationResult.data, user.id);
      return NextResponse.json(updatedCard, { status: 200 });
    });
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Card ID is required" }, { status: 400 });
    }

    // Ensure ownership
    const ownershipError = await ensureAccountOwnership(user, user.id);
    if (ownershipError) {
      return ownershipError;
    }
    
    return await prisma.$transaction(async (tx) => {
      await deleteCard(tx, id, user.id);
      return NextResponse.json({ message: "Card deleted" }, { status: 200 });
    });
  }),
}); 