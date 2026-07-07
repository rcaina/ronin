import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import prisma from "@/lib/prisma";
import { postDueRecurringTransactionsForAccount } from "@/lib/api-services/recurring";
import { evaluateBudgetNotificationsForAccount } from "@/lib/api-services/notifications";

/**
 * Daily cron entry point (see vercel.json) that, per account: posts every due
 * recurring transaction, then evaluates the two budget-driven notification
 * triggers — "category >= 90% of its allocation" and "budget period ends
 * within 3 days" (see lib/utils/notifications.ts). The third trigger,
 * "recurring transaction posted", fires inline from
 * `postDueRecurringTransactionsForAccount` itself as each occurrence posts.
 *
 * This route used to post recurring transactions only; folding the
 * notification evaluation in here (rather than a separate route/cron
 * schedule) is the lowest-churn option — same daily cadence, same
 * per-account transaction, no new vercel.json entry. The name is now a
 * slight misnomer but the path is unchanged to avoid touching vercel.json's
 * schedule config and any external references to it.
 *
 * Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}` when
 * the CRON_SECRET env var is set (see src/env.js), so this route just
 * verifies that header matches.
 *
 * Each account is processed in its own `prisma.$transaction` (rather than one
 * transaction spanning every account) so a large account list can't hold one
 * long-lived lock, and one account's failure doesn't roll back another's.
 */
export async function GET(req: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // The account set to process is the union of "has a due recurring
  // transaction" and "has an active budget" — the notification triggers
  // apply to every active budget regardless of whether that account has any
  // recurring transactions at all.
  const [dueRecurringAccounts, activeBudgetAccounts] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: { deleted: null, paused: false, nextRunAt: { lte: now } },
      distinct: ["accountId"],
      select: { accountId: true },
    }),
    prisma.budget.findMany({
      where: { deleted: null, status: "ACTIVE" },
      distinct: ["accountId"],
      select: { accountId: true },
    }),
  ]);

  const accountIds = new Set([
    ...dueRecurringAccounts.map((a) => a.accountId),
    ...activeBudgetAccounts.map((a) => a.accountId),
  ]);

  const results = [];
  for (const accountId of accountIds) {
    const { summaries, notifications } = await prisma.$transaction(
      async (tx) => {
        const summaries = await postDueRecurringTransactionsForAccount(
          tx,
          accountId,
          now,
        );
        const notifications = await evaluateBudgetNotificationsForAccount(
          tx,
          accountId,
          now,
        );
        return { summaries, notifications };
      },
    );
    results.push({
      accountId,
      posted: summaries.reduce((sum, s) => sum + s.posted, 0),
      notificationsCreated: notifications.length,
      summaries,
    });
  }

  return NextResponse.json(
    {
      accountsProcessed: results.length,
      totalPosted: results.reduce((sum, r) => sum + r.posted, 0),
      totalNotificationsCreated: results.reduce(
        (sum, r) => sum + r.notificationsCreated,
        0,
      ),
      results,
    },
    { status: 200 },
  );
}
