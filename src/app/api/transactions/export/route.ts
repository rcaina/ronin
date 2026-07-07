import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import { getTransactionsForExport } from "@/lib/api-services/transactions";
import { buildCsv, toIsoDateString } from "@/lib/utils/csv";
import type { User } from "@prisma/client";

// Exporting transactions to CSV is FREE (a trust signal — a user's data is
// never held hostage), so there is intentionally no entitlement gate here.
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      _req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { headers, rows } = await prisma.$transaction((tx) =>
        getTransactionsForExport(tx, user.accountId),
      );

      const csv = buildCsv(headers, rows);
      const filename = `ronin-transactions-${toIsoDateString(new Date())}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    },
  ),
});
