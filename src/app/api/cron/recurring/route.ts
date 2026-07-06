import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import prisma from "@/lib/prisma";
import { postDueRecurringTransactionsForAccount } from "@/lib/api-services/recurring";

/**
 * Daily cron entry point (see vercel.json) that posts every due recurring
 * transaction across every account. Vercel Cron automatically sends
 * `Authorization: Bearer ${CRON_SECRET}` when the CRON_SECRET env var is set
 * (see src/env.js), so this route just verifies that header matches.
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

  const dueAccounts = await prisma.recurringTransaction.findMany({
    where: { deleted: null, paused: false, nextRunAt: { lte: now } },
    distinct: ["accountId"],
    select: { accountId: true },
  });

  const results = [];
  for (const { accountId } of dueAccounts) {
    const summaries = await prisma.$transaction((tx) =>
      postDueRecurringTransactionsForAccount(tx, accountId, now),
    );
    results.push({
      accountId,
      posted: summaries.reduce((sum, s) => sum + s.posted, 0),
      summaries,
    });
  }

  return NextResponse.json(
    {
      accountsProcessed: results.length,
      totalPosted: results.reduce((sum, r) => sum + r.posted, 0),
      results,
    },
    { status: 200 },
  );
}
