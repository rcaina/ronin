import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { postDueRecurringTransactionsForAccount } from "@/lib/api-services/recurring";

/**
 * Lazy, on-app-load substitute for the cron job (`/api/cron/recurring`) —
 * posts any due recurring occurrences for the CURRENT user's account. Called
 * once per session by `useRecurringCatchUp` (see
 * lib/data-hooks/recurring/useRecurringCatchUp.ts) so self-hosted/dev setups
 * without cron configured still get recurring transactions posted, just on
 * next visit rather than exactly on schedule. Cheap (no-op when nothing is
 * due) and idempotent (same guarantee as the cron job — see
 * postDueRecurringTransactionsForAccount).
 */
export const POST = withUser({
  POST: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const summaries = await prisma.$transaction((tx) =>
        postDueRecurringTransactionsForAccount(tx, user.accountId),
      );
      const posted = summaries.reduce((sum, s) => sum + s.posted, 0);
      return NextResponse.json({ posted, summaries }, { status: 200 });
    },
  ),
});
