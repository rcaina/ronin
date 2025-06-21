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

export async function getCards(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  userId: string
) {
  return await tx.card.findMany({
    where: {
      userId,
      deleted: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getCard(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  id: string,
  userId: string
) {
  return await tx.card.findFirst({
    where: {
      id,
      userId,
      deleted: null,
    },
  });
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