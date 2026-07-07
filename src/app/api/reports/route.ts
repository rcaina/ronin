import { type NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/middleware/withUser";
import { withUserErrorHandling } from "@/lib/middleware/withUserErrorHandling";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
  reportsQuerySchema,
  type ReportRange,
} from "@/lib/api-schemas/reports";
import {
  getAccountEntitlements,
  paymentRequired,
} from "@/lib/api-services/entitlements";
import { canViewReportHistory } from "@/lib/utils/entitlements";
import {
  getCurrentReportBudgets,
  getHistoricalReportBudgets,
} from "@/lib/api-services/reports";
import {
  calculateCategoryBreakdown,
  calculateGroupSplitOverTime,
  calculateIncomeVsSpendingOverTime,
  calculateReportComparison,
  calculateReportSummary,
  calculateSpendingOverTime,
  deriveWindowFromBudgets,
  pickGranularity,
  previousWindow,
  type ReportBudget,
} from "@/lib/utils/reports";
import type { DateWindow } from "@/lib/utils/spending";

// Number of months a historical range covers, counted back from today.
const RANGE_MONTHS: Partial<Record<ReportRange, number>> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1y": 12,
};

// Server-side aggregation endpoint: never ships raw transactions to the
// client, only the small bucketed/summed payloads the charts need (see
// lib/utils/reports.ts). `range !== "current"` (cross-budget history) and
// `compare=true` (period-over-period comparison) are both Premium-gated
// here — a Free account requesting either gets a 402, never the data.
export const GET = withUser({
  GET: withUserErrorHandling(
    async (
      req: NextRequest,
      _context: { params: Promise<Record<string, string>> },
      user: User & { accountId: string },
    ) => {
      const { searchParams } = new URL(req.url);
      const parsed = reportsQuerySchema.safeParse({
        range: searchParams.get("range") ?? undefined,
        compare: searchParams.get("compare") ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { message: "Validation failed", errors: parsed.error.errors },
          { status: 400 },
        );
      }

      const { range, compare } = parsed.data;

      const account = await getAccountEntitlements(prisma, user.accountId);
      if (range !== "current" || compare) {
        const entitlementCheck = canViewReportHistory(account);
        if (!entitlementCheck.allowed) {
          return paymentRequired(entitlementCheck.reason);
        }
      }

      let budgets: ReportBudget[];
      let window: DateWindow;

      if (range === "current") {
        budgets = await getCurrentReportBudgets(prisma, user.accountId);
        window = deriveWindowFromBudgets(budgets);
      } else if (range === "all") {
        budgets = await getHistoricalReportBudgets(
          prisma,
          user.accountId,
          null,
        );
        window = deriveWindowFromBudgets(budgets);
      } else {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - RANGE_MONTHS[range]!);
        window = { start, end };
        budgets = await getHistoricalReportBudgets(
          prisma,
          user.accountId,
          window,
        );
      }

      // Comparisons need budgets covering the PREVIOUS window too, which the
      // fetches above don't necessarily include (a bounded historical range
      // only fetched its own window; "current"'s active budgets may not
      // overlap the prior period at all). Re-fetch across the union whenever
      // a comparison was requested — "all" already has no bound so nothing
      // extra to fetch there.
      let comparison = null;
      if (compare && range !== "all") {
        const priorWindow = previousWindow(window);
        const comparisonBudgets = await getHistoricalReportBudgets(
          prisma,
          user.accountId,
          { start: priorWindow.start, end: window.end },
        );
        comparison = calculateReportComparison(
          comparisonBudgets,
          window,
          priorWindow,
        );
      }

      const granularity = pickGranularity(window);

      return NextResponse.json(
        {
          range,
          granularity,
          window: {
            start: window.start.toISOString(),
            end: window.end.toISOString(),
          },
          summary: calculateReportSummary(budgets, window),
          spendingOverTime: calculateSpendingOverTime(
            budgets,
            window,
            granularity,
          ),
          categoryBreakdown: calculateCategoryBreakdown(budgets, window),
          groupSplitOverTime: calculateGroupSplitOverTime(
            budgets,
            window,
            granularity,
          ),
          incomeVsSpendingOverTime: calculateIncomeVsSpendingOverTime(
            budgets,
            window,
            granularity,
          ),
          comparison,
        },
        { status: 200 },
      );
    },
  ),
});
