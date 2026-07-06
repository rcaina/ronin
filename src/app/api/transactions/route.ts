import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import {
  getTransactions,
  createTransaction,
} from "@/lib/api-services/transactions";
import { createTransactionSchema } from "@/lib/api-schemas/transactions";
import type { User } from "@prisma/client";
import {
  BUDGET_LOCKED_REASON,
  getAccountEntitlements,
  isBudgetWriteLocked,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canSplitTransactions } from "@/lib/utils/entitlements";

export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") ?? "1");
      const limit = parseInt(searchParams.get("limit") ?? "20");
      const offset = (page - 1) * limit;

      return await prisma.$transaction(async (tx) => {
        const { transactions, totalCount } = await getTransactions(
          tx,
          user.accountId,
          { page, limit, offset },
        );

        return NextResponse.json(
          {
            transactions,
            pagination: {
              page,
              limit,
              totalCount,
              totalPages: Math.ceil(totalCount / limit),
              hasNextPage: page < Math.ceil(totalCount / limit),
              hasPreviousPage: page > 1,
            },
          },
          { status: 200 },
        );
      });
    },
  ),
});

export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = createTransactionSchema.safeParse(body);

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

      if (
        validationResult.data.splits &&
        validationResult.data.splits.length > 0
      ) {
        const account = await getAccountEntitlements(prisma, user.accountId);
        const entitlementCheck = canSplitTransactions(account);
        if (!entitlementCheck.allowed) {
          return paymentRequired(entitlementCheck.reason);
        }
      }

      return await prisma.$transaction(async (tx) => {
        const transaction = await createTransaction(
          tx,
          validationResult.data,
          user,
        );

        return NextResponse.json(transaction, { status: 200 });
      });
    },
  ),
});
