import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createTransactionsBatch } from "@/lib/api-services/transactions";
import { createTransactionsBatchSchema } from "@/lib/api-schemas/transactions";
import type { User } from "@prisma/client";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = createTransactionsBatchSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      return await prisma.$transaction(async (tx) => {
        const transactions = await createTransactionsBatch(
          tx,
          validationResult.data,
          user,
        );

        return NextResponse.json({ transactions }, { status: 200 });
      });
    },
  ),
});
