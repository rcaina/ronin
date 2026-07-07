import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getReports } from "../services/reports";
import type { ReportsRequestQuery } from "@/lib/types/reports";

export const reportsKey = (query: ReportsRequestQuery) =>
  ["reports", query.range ?? "current", query.compare ?? false] as const;

/**
 * Server-aggregated report data for `/reports` (see `GET /api/reports`).
 * `range` beyond "current" and `compare: true` are Premium-gated server-side
 * (`canViewReportHistory`) — the page only passes those once it has confirmed
 * `useBillingStatus().isPremium`, and falls back to `UpgradeModal` via
 * `UpgradeRequiredError` if the account's plan changes mid-session.
 * `retry: false` so a 402 surfaces immediately instead of retrying 3 times.
 */
export const useReports = (query: ReportsRequestQuery = {}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: reportsKey(query),
    queryFn: () => getReports(query),
    enabled: !!session,
    staleTime: 60 * 1000,
    retry: false,
  });
};
