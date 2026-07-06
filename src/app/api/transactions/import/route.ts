import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import {
  createTransactionsBatch,
  getImportContext,
} from "@/lib/api-services/transactions";
import {
  importTransactionsSchema,
  type CreateTransactionSchema,
} from "@/lib/api-schemas/transactions";
import {
  evaluateImportRow,
  type ImportPreviewRow,
} from "@/lib/utils/transaction-import";
import type { User } from "@prisma/client";
import {
  BUDGET_LOCKED_REASON,
  getAccountEntitlements,
  isBudgetWriteLocked,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canImportTransactions } from "@/lib/utils/entitlements";

// CSV import is PREMIUM (a migration convenience from Mint/YNAB/bank exports).
// The endpoint runs in two modes:
//   - preview (commit: false): validate + annotate rows (category matches,
//     duplicate flags) so the client can render the confirmation step.
//   - commit (commit: true): insert the valid rows via the shared batch path.
export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const body = (await req.json()) as unknown;
      const validationResult = importTransactionsSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: "Validation failed",
            errors: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const { budgetId, rows, commit } = validationResult.data;

      // Premium gate — return (do not throw) so the 402 keeps the
      // { error, upgradeRequired } shape the client's parseErrorResponse
      // expects to open the UpgradeModal.
      const account = await getAccountEntitlements(prisma, user.accountId);
      const entitlementCheck = canImportTransactions(account);
      if (!entitlementCheck.allowed) {
        return paymentRequired(entitlementCheck.reason);
      }

      // A locked (read-only after downgrade) budget also can't receive imports.
      if (await isBudgetWriteLocked(prisma, user.accountId, budgetId)) {
        return paymentRequired(BUDGET_LOCKED_REASON);
      }

      return await prisma.$transaction(async (tx) => {
        const { budgetName, context } = await getImportContext(
          tx,
          user.accountId,
          budgetId,
        );

        const preview: ImportPreviewRow[] = rows.map((row, index) =>
          evaluateImportRow(row, index, context),
        );

        if (!commit) {
          return NextResponse.json({ budgetName, preview }, { status: 200 });
        }

        const validRows = preview.filter((r) => r.valid);
        if (validRows.length === 0) {
          return NextResponse.json(
            { message: "No valid rows to import" },
            { status: 400 },
          );
        }

        const transactions: CreateTransactionSchema[] = validRows.map((r) => ({
          budgetId,
          name: r.name || undefined,
          amount: r.amount!,
          categoryId: r.matchedCategoryId ?? undefined,
          cardId: r.matchedCardId ?? undefined,
          transactionType: r.transactionType,
          occurredAt: r.occurredAt ?? undefined,
        }));

        const created = await createTransactionsBatch(
          tx,
          { transactions },
          user,
        );

        return NextResponse.json(
          {
            imported: created.length,
            skipped: preview.length - created.length,
          },
          { status: 200 },
        );
      });
    },
  ),
});
