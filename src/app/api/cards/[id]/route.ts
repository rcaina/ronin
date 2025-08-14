import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { deleteCard, getCardById, updateCard } from "@/lib/api-services/cards";
import { updateCardSchema } from "@/lib/api-schemas/cards";
import { ensureCardAccountOwnership, ensureCardUserOwnership, validateCardId } from "@/lib/utils/auth";

export const GET = withUser({
  GET: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const cardId = validateCardId(id);
    await ensureCardAccountOwnership(cardId, user.accountId);
    
    return await prisma.$transaction(async (tx) => {
      const card = await getCardById(tx, cardId, user.id);
      return NextResponse.json(card, { status: 200 });
    });
  }),
});

export const PUT = withUser({
  PUT: withUserErrorHandling(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const cardId = validateCardId(id);
    await ensureCardAccountOwnership(cardId, user.accountId);

    const body = await req.json() as unknown;
    const validationResult = updateCardSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      const updatedCard = await updateCard(tx, cardId, validationResult.data, user);
      return NextResponse.json(updatedCard, { status: 200 });
    });
  }),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(async (_req: NextRequest, context: { params: Promise<Record<string, string>> }, user: User & { accountId: string }) => {
    const { id } = await context.params;
    const cardId = validateCardId(id);
    await ensureCardUserOwnership(cardId, user.id);
    
    return await prisma.$transaction(async (tx) => {
      await deleteCard(tx, cardId, user.id);
      return NextResponse.json({ message: "Card deleted" }, { status: 200 });
    });
  }),
}); 