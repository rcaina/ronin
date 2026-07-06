import type { ReportRange } from "@/lib/api-schemas/reports";
import type {
  CategoryBreakdownPoint,
  GroupSplitPoint,
  IncomeVsSpendingPoint,
  ReportComparison,
  ReportGranularity,
  ReportSummary,
  SpendingOverTimePoint,
} from "@/lib/utils/reports";

export interface ReportsRequestQuery {
  range?: ReportRange;
  /** Premium-only "this period vs last" comparison — denied server-side for
   * Free accounts regardless of `range` (see `canViewReportHistory`). */
  compare?: boolean;
}

/** The small, pre-aggregated payload `GET /api/reports` returns — server
 * does all the bucketing/summing (see `lib/utils/reports.ts`), never ships
 * raw transactions to the client. */
export interface ReportsResponse {
  range: ReportRange;
  granularity: ReportGranularity;
  window: { start: string; end: string };
  summary: ReportSummary;
  spendingOverTime: SpendingOverTimePoint[];
  categoryBreakdown: CategoryBreakdownPoint[];
  groupSplitOverTime: GroupSplitPoint[];
  incomeVsSpendingOverTime: IncomeVsSpendingPoint[];
  comparison: ReportComparison | null;
}
