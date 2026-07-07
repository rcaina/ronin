import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import {
  deleteTransaction,
  updateTransaction,
} from "@/lib/api-services/transactions";
import { updateTransactionSchema } from "@/lib/api-schemas/transactions";
import { type User } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  ensureTransactionAccountOwnership,
  validateTransactionId,
} from "@/lib/utils/auth";
import {
  BUDGET_LOCKED_REASON,
  getAccountEntitlements,
  isBudgetWriteLocked,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canSplitTransactions } from "@/lib/utils/entitlements";

export const PUT = withUser({
  PUT: withUserErrorHandling(
    async (
      req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;
      const transactionId = validateTransactionId(id);
      await ensureTransactionAccountOwnership(transactionId, user.accountId);

      const body = (await req.json()) as unknown;
      const validationResult = updateTransactionSchema.safeParse(body);

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
        validationResult.data.splits &&
        validationResult.data.splits.length > 0
      ) {
        const account = await getAccountEntitlements(prisma, user.accountId);
        const entitlementCheck = canSplitTransactions(account);
        if (!entitlementCheck.allowed) {
          return paymentRequired(entitlementCheck.reason);
        }
      }

      const existing = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { budgetId: true },
      });
      // Block edits to a transaction in a locked budget, and block moving a
      // transaction into a locked budget (destination check).
      const budgetIdsToCheck = new Set<string>();
      if (existing) budgetIdsToCheck.add(existing.budgetId);
      if (validationResult.data.budgetId)
        budgetIdsToCheck.add(validationResult.data.budgetId);
      for (const budgetId of budgetIdsToCheck) {
        if (await isBudgetWriteLocked(prisma, user.accountId, budgetId)) {
          return paymentRequired(BUDGET_LOCKED_REASON);
        }
      }

      return await prisma.$transaction(async (tx) => {
        const transaction = await updateTransaction(
          tx,
          transactionId,
          validationResult.data,
          user,
        );

        return NextResponse.json(
          { message: "Transaction updated successfully", transaction },
          { status: 200 },
        );
      });
    },
  ),
});

export const DELETE = withUser({
  DELETE: withUserErrorHandling(
    async (
      req: NextRequest,
      context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { id } = await context.params;

      if (!id) {
        return NextResponse.json(
          { message: "Transaction ID is required" },
          { status: 400 },
        );
      }

      const existing = await prisma.transaction.findFirst({
        where: { id, accountId: user.accountId, deleted: null },
        select: { budgetId: true },
      });
      if (
        existing &&
        (await isBudgetWriteLocked(prisma, user.accountId, existing.budgetId))
      ) {
        return paymentRequired(BUDGET_LOCKED_REASON);
      }

      return await prisma.$transaction(async (tx) => {
        await deleteTransaction(tx, id, user);
        return NextResponse.json(
          { message: "Transaction deleted" },
          { status: 200 },
        );
      });
    },
  ),
});
