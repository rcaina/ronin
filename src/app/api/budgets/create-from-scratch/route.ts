import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createBudgetFromScratchWithCards } from "@/lib/api-services/budgets";
import { createBudgetWithCardsSchema } from "@/lib/api-schemas/budgets";
import type { User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { HttpError } from "@/lib/errors";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new HttpError("Invalid request body", 400);
      }

      const validatedResult = createBudgetWithCardsSchema.safeParse(body);

      if (!validatedResult.success) {
        throw new HttpError("Invalid request body", 400, validatedResult.error);
      }

      return prisma.$transaction(async (tx) => {
        const result = await createBudgetFromScratchWithCards(
          tx,
          validatedResult.data,
          user,
        );
        return NextResponse.json(result, { status: 201 });
      });
    },
  ),
});
