import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { mergeCardsSchema } from "@/lib/api-schemas/cards";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { mergeCards } from "@/lib/api-services/cards";
import { HttpError } from "@/lib/errors";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (req: NextRequest, _context, user: User & { accountId: string }) => {
      const body = (await req.json()) as unknown;
      const validationResult = mergeCardsSchema.safeParse(body);

      if (!validationResult.success) {
        throw new HttpError("Validation failed", 400, validationResult.error);
      }

      return await prisma.$transaction(async (tx) => {
        const card = await mergeCards(tx, validationResult.data, user);

        return NextResponse.json(card, { status: 200 });
      });
    },
  ),
});
