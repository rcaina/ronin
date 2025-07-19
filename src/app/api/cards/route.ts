import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createCardSchema } from "@/lib/api-schemas/cards";
import { ensureAccountOwnership } from "@/lib/ownership";
import { CardType, TransactionType, type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const GET = withUser({
  GET: withUserErrorHandling(async (req: NextRequest, _context, user: User & { accountId: string }) => {
    const { searchParams } = new URL(req.url);
    const excludeCardPayments = searchParams.get('excludeCardPayments') === 'true';
    
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
            ...(excludeCardPayments && {
              transactionType: {
                not: TransactionType.CARD_PAYMENT
              }
            }),
          },
          select: {
            amount: true,
            transactionType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate amountSpent for each card by summing related transactions
    const cardsWithAmountSpent = cards.map(card => {
      const isCreditCard = card.cardType === CardType.CREDIT || card.cardType === CardType.BUSINESS_CREDIT;
      
      let amountSpent = 0;
      if (isCreditCard) {
        // For credit cards: handle regular transactions and card payments differently
        amountSpent = card.transactions.reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
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
      
      return {
        ...card,
        amountSpent,
        transactions: undefined, // Remove transactions from response
      };
    });

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