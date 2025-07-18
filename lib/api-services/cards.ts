import { type PrismaClient, type User, type CardType } from "@prisma/client";

export interface Card {
  id: string;
  name: string;
  cardType: CardType;
  amountSpent?: number;
  spendingLimit?: number;
  userId: string;
  user: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
  };
  deleted?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardRequest {
  name: string;
  cardType: CardType;
  spendingLimit?: number;
}

export interface UpdateCardRequest {
  name?: string;
  cardType?: CardType;
  spendingLimit?: number;
}

export interface CreateCardData {
  name: string;
  cardType: CardType;
  spendingLimit?: number;
}

export interface UpdateCardData {
  name?: string;
  cardType?: CardType;
  spendingLimit?: number;
}

/**
 * Calculate the amount spent for a card based on its transactions
 */
function calculateCardAmountSpent(
  cardType: CardType,
  transactions: Array<{ amount: number; transactionType: string }>
): number {
  const isCreditCard = cardType === 'CREDIT' || cardType === 'BUSINESS_CREDIT';
  
  if (isCreditCard) {
    // For credit cards: handle regular transactions and card payments differently
    return transactions.reduce((sum, transaction) => {
      if (transaction.transactionType === 'CARD_PAYMENT') {
        // Card payments reduce the balance (positive amount = payment received)
        return sum + transaction.amount; // Subtract payment amount (reduces balance)
      } else {
        // Regular transactions: negative = purchases (increase balance), positive = returns (decrease balance)
        return sum + transaction.amount;
      }
    }, 0);
  } else {
    // For debit/cash cards: sum all amounts normally
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }
}

export async function getCardsForAccount(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  userIds: string[]
) {
  // Get cards for all users in the account
  const allCards = await Promise.all(
    userIds.map(userId => getCards(tx, userId))
  );

  // Flatten the results and sort by creation date
  return allCards
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCards(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  userId: string
) {
  const cards = await tx.card.findMany({
    where: {
      userId,
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate amountSpent for each card by summing related transactions
  return cards.map(card => {
    const amountSpent = calculateCardAmountSpent(card.cardType, card.transactions);
    
    return {
      ...card,
      amountSpent,
      transactions: undefined, // Remove transactions from response
    };
  });
}

export async function getCard(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  userId: string
) {
  const card = await tx.card.findFirst({
    where: {
      id,
      userId,
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

  if (!card) return null;

  // Calculate amountSpent by summing related transactions
  const amountSpent = calculateCardAmountSpent(card.cardType, card.transactions);

  return {
    ...card,
    amountSpent,
    transactions: undefined, // Remove transactions from response
  };
}

export async function createCard(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  data: CreateCardData,
  user: User
) {
  return await tx.card.create({
    data: {
      name: data.name,
      cardType: data.cardType,
      spendingLimit: data.spendingLimit,
      userId: user.id,
    },
  });
}

export async function updateCard(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  data: UpdateCardData,
  userId: string
) {
  return await tx.card.update({
    where: {
      id,
      userId,
      deleted: null,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.cardType && { cardType: data.cardType }),
      ...(data.spendingLimit !== undefined && { spendingLimit: data.spendingLimit }),
    },
  });
}

export async function deleteCard(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  userId: string
) {
  return await tx.card.update({
    where: {
      id,
      userId,
      deleted: null,
    },
    data: {
      deleted: new Date(),
    },
  });
} 