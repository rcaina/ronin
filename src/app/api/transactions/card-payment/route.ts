import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { createCardPayment } from "@/lib/api-services/transactions";
import { createCardPaymentSchema } from "@/lib/api-schemas/transactions";
import {
  BUDGET_LOCKED_REASON,
  isBudgetWriteLocked,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import type { User } from "@prisma/client";

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = createCardPaymentSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      if (
        await isBudgetWriteLocked(
          prisma,
          user.accountId,
          validationResult.data.budgetId,
        )
      ) {
        return paymentRequired(BUDGET_LOCKED_REASON);
      }

      return await prisma.$transaction(async (tx) => {
        const result = await createCardPayment(tx, validationResult.data, user);

        return NextResponse.json(
          { message: "Card payment created successfully", result },
          { status: 201 },
        );
      });
    },
  ),
});
