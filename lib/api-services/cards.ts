import { CardType, type PrismaClient, type User, TransactionType } from "@prisma/client";

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
    const isCreditCard = card.cardType === CardType.CREDIT || card.cardType === CardType.BUSINESS_CREDIT;
    
    let amountSpent = 0;
    if (isCreditCard) {
      // For credit cards: handle regular transactions and card payments differently
      amountSpent = card.transactions.reduce((sum, transaction) => {
        if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
          // Card payments reduce the balance (positive amount = payment received)
          return sum - transaction.amount; // Subtract payment amount (reduces balance)
        } else if (transaction.transactionType === TransactionType.RETURN) {
          // Returns reduce the balance (positive amount = refund received)
          return sum - transaction.amount; // Subtract return amount (reduces balance)
        } else {
          // Regular transactions: positive = purchases (increase balance)
          return sum + transaction.amount;
        }
      }, 0);
    } else {
      // For debit/cash cards: sum all amounts normally
      amountSpent = card.transactions.reduce((sum, transaction) => {
        if (transaction.transactionType === TransactionType.RETURN) {
          // Returns reduce the balance (positive amount = refund received)
          return sum - transaction.amount; // Subtract return amount (reduces balance)
        } else {
          // Regular transactions: positive = purchases (increase balance)
          return sum + transaction.amount;
        }
      }, 0);
    }
    
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
  const isCreditCard = card.cardType === CardType.CREDIT || card.cardType === CardType.BUSINESS_CREDIT;
  
  let amountSpent = 0;
  if (isCreditCard) {
    // For credit cards: handle regular transactions and card payments differently
    amountSpent = card.transactions.reduce((sum, transaction) => {
      if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
        // Card payments reduce the balance (positive amount = payment received)
        return sum - transaction.amount; // Subtract payment amount (reduces balance)
      } else if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce the balance (positive amount = refund received)
        return sum - transaction.amount; // Subtract return amount (reduces balance)
      } else {
        // Regular transactions: positive = purchases (increase balance)
        return sum + transaction.amount;
      }
    }, 0);
  } else {
    // For debit/cash cards: sum all amounts normally
    amountSpent = card.transactions.reduce((sum, transaction) => {
      if (transaction.transactionType === TransactionType.RETURN) {
        // Returns reduce the balance (positive amount = refund received)
        return sum - transaction.amount; // Subtract return amount (reduces balance)
      } else {
        // Regular transactions: positive = purchases (increase balance)
        return sum + transaction.amount;
      }
    }, 0);
  }

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