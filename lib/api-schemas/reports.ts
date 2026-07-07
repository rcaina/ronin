import { z } from "zod";

/**
 * `current` is the Free-tier default: the account's own active budget(s),
 * never gated. Every other range requires cross-budget history — see
 * `canViewReportHistory` in `lib/utils/entitlements.ts`.
 */
export const REPORT_RANGES = [
  "current",
  "1m",
  "3m",
  "6m",
  "1y",
  "all",
] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const reportsQuerySchema = z.object({
  range: z.enum(REPORT_RANGES).default("current"),
  // Query params arrive as strings; "true" opts into the premium "this
  // period vs last" comparison, anything else (including absent) is off.
  compare: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
