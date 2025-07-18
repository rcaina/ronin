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

    // First, find the card and verify it belongs to a user in the same account
    const card = await prisma.card.findFirst({
      where: {
        id,
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
            transactionType: true,
          },
        },
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

    // Calculate amountSpent by summing related transactions
    const isCreditCard = card.cardType === 'CREDIT' || card.cardType === 'BUSINESS_CREDIT';
    
    let amountSpent = 0;
    if (isCreditCard) {
      // For credit cards: handle regular transactions and card payments differently
      amountSpent = card.transactions.reduce((sum, transaction) => {
        if (transaction.transactionType === 'CARD_PAYMENT') {
          // Card payments reduce the balance (positive amount = payment received)
          return sum - transaction.amount; // Subtract payment amount (reduces balance)
        } else {
          // Regular transactions: negative = purchases (increase balance), positive = returns (decrease balance)
          return sum + transaction.amount;
        }
      }, 0);
    } else {
      // For debit/cash cards: sum all amounts normally
      amountSpent = card.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    }

    const cardWithAmountSpent = {
      ...card,
      amountSpent,
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

    // First, find the card to verify ownership
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

    // Ensure the card belongs to a user in the same account
    const accountOwnershipError = await ensureAccountOwnership(user, card.userId);
    if (accountOwnershipError) {
      return accountOwnershipError;
    }

    // Ensure the current user owns the card (only card owner can edit)
    if (card.userId !== user.id) {
      return NextResponse.json(
        { message: "You can only edit your own cards" },
        { status: 403 }
      );
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

    // First, find the card to verify ownership
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

    // Ensure the card belongs to a user in the same account
    const accountOwnershipError = await ensureAccountOwnership(user, card.userId);
    if (accountOwnershipError) {
      return accountOwnershipError;
    }

    // Ensure the current user owns the card (only card owner can delete)
    if (card.userId !== user.id) {
      return NextResponse.json(
        { message: "You can only delete your own cards" },
        { status: 403 }
      );
    }
    
    return await prisma.$transaction(async (tx) => {
      await deleteCard(tx, id, user.id);
      return NextResponse.json({ message: "Card deleted" }, { status: 200 });
    });
  }),
}); 