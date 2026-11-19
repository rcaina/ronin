"use client";

import { useEffect, useState } from "react";
import { BarChart3, Lock, Receipt, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/Tabs";
import { Metric, MetricStrip } from "@/components/MetricStrip";
import { HeadlineAmount, SummaryHeadline } from "@/components/SummaryHeadline";
import UpgradeModal from "@/components/UpgradeModal";
import { usePageLoading } from "@/components/ConditionalLayout";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  CHART_COLORS,
  GROUP_COLORS,
  STATUS_COLORS,
  ChartEmptyState,
  chartAxisProps,
  chartCursorFill,
  chartGridProps,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  formatChartCurrency,
  formatCompactCurrency,
} from "@/components/recharts/theme";
import { useBillingStatus } from "@/lib/data-hooks/billing/useBilling";
import { useReports } from "@/lib/data-hooks/reports/useReports";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";
import type { ReportRange } from "@/lib/api-schemas/reports";
import { cn, formatCurrency } from "@/lib/utils";

interface RangeOption {
  value: ReportRange;
  label: string;
  /** Premium-gated ranges unlock cross-budget history; "current" never is. */
  premium: boolean;
}

const RANGE_OPTIONS: RangeOption[] = [
  { value: "current", label: "Current", premium: false },
  { value: "1m", label: "1M", premium: true },
  { value: "3m", label: "3M", premium: true },
  { value: "6m", label: "6M", premium: true },
  { value: "1y", label: "1Y", premium: true },
  { value: "ytd", label: "YTD", premium: true },
  { value: "all", label: "All", premium: true },
];

const GROUP_ORDER = ["NEEDS", "WANTS", "INVESTMENT"] as const;

const UPGRADE_REASON =
  "Cross-budget report history is a Premium feature. Upgrade to Premium to view trends and comparisons beyond your current budget.";

// Horizontal-scroll min-width so dense time series stay legible at 375px
// instead of squeezing every bucket into the viewport (see DESIGN.md #5).
const timeSeriesMinWidth = (points: number) => Math.max(320, points * 56);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("current");
  const [compare, setCompare] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const { data: billingStatus } = useBillingStatus();
  const isPremium = billingStatus?.isPremium ?? false;

  // Comparison only makes sense once a bounded historical range is picked —
  // "current" and "all" don't have a natural "previous period".
  const canCompare = isPremium && range !== "current" && range !== "all";
  const effectiveCompare = canCompare && compare;
  const priorLabel = range === "ytd" ? "last year" : "last period";

  const { data, isLoading, isPlaceholderData, error } = useReports({
    range,
    compare: effectiveCompare,
  });

  usePageLoading(isLoading, "Loading your reports...");

  // Defense in depth: the range/compare pickers below already keep a Free
  // account from requesting gated params, but if the plan changes mid-session
  // the server's 402 still surfaces here instead of a silent empty state.
  useEffect(() => {
    if (error instanceof UpgradeRequiredError) {
      setUpgradeReason(error.message);
    }
  }, [error]);

  const handleSelectRange = (option: RangeOption) => {
    if (option.premium && !isPremium) {
      setUpgradeReason(UPGRADE_REASON);
      return;
    }
    if (option.value === "current" || option.value === "all") {
      setCompare(false);
    }
    setRange(option.value);
  };

  const handleToggleCompare = () => {
    if (!isPremium) {
      setUpgradeReason(UPGRADE_REASON);
      return;
    }
    if (!canCompare) return;
    setCompare((prev) => !prev);
  };

  if (isLoading) {
    return null;
  }

  if (error && !data && !(error instanceof UpgradeRequiredError)) {
    return <div className="p-6 text-red-600">Failed to load reports</div>;
  }

  const summary = data?.summary ?? {
    income: 0,
    spending: 0,
    net: 0,
    savingsRate: 0,
  };
  const incomeChangePct = data?.comparison?.incomeChangePct ?? null;
  const spendingChangePct = data?.comparison?.spendingChangePct ?? null;
  const spendingOverTime = data?.spendingOverTime ?? [];
  const categoryBreakdown = data?.categoryBreakdown.slice(0, 8) ?? [];
  const groupSplitOverTime = data?.groupSplitOverTime ?? [];
  const incomeVsSpendingOverTime = data?.incomeVsSpendingOverTime ?? [];

  const rangeLoadingClass = cn(
    "transition-opacity duration-200",
    isPlaceholderData && "opacity-60",
  );

  const hasSpendingOverTime = spendingOverTime.some((p) => p.spending > 0);
  const hasGroupSplit = groupSplitOverTime.some(
    (p) => p.NEEDS + p.WANTS + p.INVESTMENT > 0,
  );
  const hasIncomeVsSpending = incomeVsSpendingOverTime.some(
    (p) => p.income > 0 || p.spending > 0,
  );

  return (
    <div className="flex flex-col bg-surface pt-4 lg:h-screen lg:pt-0">
      <PageHeader
        title="Reports & trends"
        description="See where your money goes, over time"
      />

      <div className="pt-2 lg:flex-1 lg:overflow-hidden lg:pt-0">
        <div className="lg:h-full lg:overflow-y-auto">
          <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 lg:px-8 lg:pb-8">
            {/* Range picker + comparison toggle */}
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                size="compact"
                scroll
                className="max-w-full shrink-0"
                ariaLabel="Select report range"
                items={RANGE_OPTIONS.map((option) => ({
                  id: option.value,
                  label: option.label,
                  icon: option.premium && !isPremium ? Lock : undefined,
                }))}
                value={range}
                onChange={(value) => {
                  const option = RANGE_OPTIONS.find((o) => o.value === value);
                  if (option) handleSelectRange(option);
                }}
              />

              <button
                onClick={handleToggleCompare}
                role="switch"
                aria-checked={effectiveCompare}
                aria-label="Compare to previous period"
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border border-gray-200/70 px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out",
                  effectiveCompare
                    ? "border-secondary/40 bg-secondary/10 text-secondary-700"
                    : "text-gray-500 hover:text-gray-700",
                  isPremium && !canCompare && "cursor-not-allowed opacity-50",
                )}
                title={
                  !isPremium
                    ? "Premium feature"
                    : !canCompare
                      ? "Pick a 1M/3M/6M/1Y/YTD range to compare periods"
                      : "Compare to the previous period"
                }
              >
                {!isPremium && <Lock className="h-3 w-3" />}
                Compare to previous period
              </button>
            </div>

            {!isPremium && (
              <div className="card-surface mb-4 flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-700">
                  <Lock className="h-4 w-4" />
                </div>
                <p className="text-sm text-gray-600">
                  You&apos;re viewing your current budget. Upgrade to Premium
                  for cross-budget history and period comparisons.
                </p>
              </div>
            )}

            <SummaryHeadline className={rangeLoadingClass}>
              {summary.income <= 0 && summary.spending <= 0 ? (
                <>Nothing recorded in this range yet.</>
              ) : summary.net >= 0 ? (
                <>
                  You kept{" "}
                  <HeadlineAmount>{formatCurrency(summary.net)}</HeadlineAmount>{" "}
                  of your income.
                </>
              ) : (
                <>
                  You spent{" "}
                  <HeadlineAmount tone="negative">
                    {formatCurrency(Math.abs(summary.net))}
                  </HeadlineAmount>{" "}
                  more than you earned.
                </>
              )}
            </SummaryHeadline>

            {/* Stat row */}
            <MetricStrip
              aria-busy={isPlaceholderData}
              className={cn("mb-4", rangeLoadingClass)}
            >
              <Metric
                label="Income"
                value={formatCurrency(summary.income)}
                hint={
                  incomeChangePct != null
                    ? `${formatPercent(incomeChangePct)} vs ${priorLabel}`
                    : "This period"
                }
                valueClassName="text-green-600"
              />
              <Metric
                label="Spending"
                value={formatCurrency(summary.spending)}
                hint={
                  spendingChangePct != null
                    ? `${formatPercent(spendingChangePct)} vs ${priorLabel}`
                    : "This period"
                }
              />
              <Metric
                label="Savings rate"
                value={`${summary.savingsRate.toFixed(1)}%`}
                hint="Of income kept"
              />
            </MetricStrip>

            {/* Charts */}
            <div
              aria-busy={isPlaceholderData}
              className={cn(
                "grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2",
                rangeLoadingClass,
              )}
            >
              {/* Spending over time */}
              <div className="card-surface p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Spending over time
                </h3>
                {hasSpendingOverTime ? (
                  <div className="scrollbar-hide overflow-x-auto">
                    <div
                      style={{
                        minWidth: timeSeriesMinWidth(spendingOverTime.length),
                      }}
                    >
                      <ChartContainer height={220}>
                        <AreaChart data={spendingOverTime}>
                          <defs>
                            <linearGradient
                              id="reportsSpendingFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={CHART_COLORS[0]}
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor={CHART_COLORS[0]}
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid {...chartGridProps} />
                          <XAxis dataKey="label" {...chartAxisProps} />
                          <YAxis
                            tickFormatter={(value: unknown) =>
                              typeof value === "number"
                                ? formatCompactCurrency(value)
                                : ""
                            }
                            {...chartAxisProps}
                            width={44}
                          />
                          <Tooltip
                            contentStyle={chartTooltipStyle}
                            labelStyle={chartTooltipLabelStyle}
                            itemStyle={chartTooltipItemStyle}
                            formatter={(value: unknown) =>
                              typeof value === "number"
                                ? formatChartCurrency(value)
                                : String(value)
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="spending"
                            name="Spending"
                            stroke={CHART_COLORS[0]}
                            fill="url(#reportsSpendingFill)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </div>
                ) : (
                  <ChartEmptyState
                    icon={Receipt}
                    message="No spending yet"
                    height={220}
                  />
                )}
              </div>

              {/* Category breakdown */}
              <div className="card-surface p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Category breakdown
                </h3>
                {categoryBreakdown.length > 0 ? (
                  <>
                    <ChartContainer
                      height={Math.max(180, categoryBreakdown.length * 32)}
                    >
                      <BarChart
                        data={categoryBreakdown}
                        layout="vertical"
                        margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={(value: unknown) =>
                            typeof value === "number"
                              ? formatCompactCurrency(value)
                              : ""
                          }
                          {...chartAxisProps}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          {...chartAxisProps}
                        />
                        <Tooltip
                          cursor={{ fill: chartCursorFill }}
                          contentStyle={chartTooltipStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                          formatter={(value: unknown) =>
                            typeof value === "number"
                              ? formatChartCurrency(value)
                              : String(value)
                          }
                        />
                        <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                          {categoryBreakdown.map((entry) => (
                            <Cell
                              key={entry.categoryId}
                              fill={GROUP_COLORS[entry.group]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                      {GROUP_ORDER.map((group) => (
                        <div key={group} className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: GROUP_COLORS[group] }}
                          />
                          <span className="capitalize text-gray-500">
                            {group.toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <ChartEmptyState icon={BarChart3} message="No spending yet" />
                )}
              </div>

              {/* Needs/Wants/Investment split over time */}
              <div className="card-surface p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Needs, wants & investment
                </h3>
                {hasGroupSplit ? (
                  <div className="scrollbar-hide overflow-x-auto">
                    <div
                      style={{
                        minWidth: timeSeriesMinWidth(groupSplitOverTime.length),
                      }}
                    >
                      <ChartContainer height={220}>
                        <AreaChart data={groupSplitOverTime}>
                          <CartesianGrid {...chartGridProps} />
                          <XAxis dataKey="label" {...chartAxisProps} />
                          <YAxis
                            tickFormatter={(value: unknown) =>
                              typeof value === "number"
                                ? formatCompactCurrency(value)
                                : ""
                            }
                            {...chartAxisProps}
                            width={44}
                          />
                          <Tooltip
                            contentStyle={chartTooltipStyle}
                            labelStyle={chartTooltipLabelStyle}
                            itemStyle={chartTooltipItemStyle}
                            formatter={(value: unknown, name?: string) =>
                              typeof value === "number"
                                ? [
                                    formatChartCurrency(value),
                                    name
                                      ? name[0] + name.slice(1).toLowerCase()
                                      : "",
                                  ]
                                : [String(value), name ?? ""]
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="NEEDS"
                            name="Needs"
                            stackId="groups"
                            stroke={GROUP_COLORS.NEEDS}
                            fill={GROUP_COLORS.NEEDS}
                            fillOpacity={0.55}
                          />
                          <Area
                            type="monotone"
                            dataKey="WANTS"
                            name="Wants"
                            stackId="groups"
                            stroke={GROUP_COLORS.WANTS}
                            fill={GROUP_COLORS.WANTS}
                            fillOpacity={0.55}
                          />
                          <Area
                            type="monotone"
                            dataKey="INVESTMENT"
                            name="Investment"
                            stackId="groups"
                            stroke={GROUP_COLORS.INVESTMENT}
                            fill={GROUP_COLORS.INVESTMENT}
                            fillOpacity={0.55}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </div>
                ) : (
                  <ChartEmptyState
                    icon={BarChart3}
                    message="No spending yet"
                    height={220}
                  />
                )}
                <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                  {GROUP_ORDER.map((group) => (
                    <div key={group} className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: GROUP_COLORS[group] }}
                      />
                      <span className="capitalize text-gray-500">
                        {group.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Income vs spending */}
              <div className="card-surface p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Income vs spending
                </h3>
                {hasIncomeVsSpending ? (
                  <div className="scrollbar-hide overflow-x-auto">
                    <div
                      style={{
                        minWidth: timeSeriesMinWidth(
                          incomeVsSpendingOverTime.length,
                        ),
                      }}
                    >
                      <ChartContainer height={220}>
                        <BarChart data={incomeVsSpendingOverTime}>
                          <CartesianGrid {...chartGridProps} />
                          <XAxis dataKey="label" {...chartAxisProps} />
                          <YAxis
                            tickFormatter={(value: unknown) =>
                              typeof value === "number"
                                ? formatCompactCurrency(value)
                                : ""
                            }
                            {...chartAxisProps}
                            width={44}
                          />
                          <Tooltip
                            cursor={{ fill: chartCursorFill }}
                            contentStyle={chartTooltipStyle}
                            labelStyle={chartTooltipLabelStyle}
                            itemStyle={chartTooltipItemStyle}
                            formatter={(value: unknown, name?: string) =>
                              typeof value === "number"
                                ? [
                                    formatChartCurrency(value),
                                    name === "income" ? "Income" : "Spending",
                                  ]
                                : [String(value), name ?? ""]
                            }
                          />
                          <Bar
                            dataKey="income"
                            name="income"
                            fill={STATUS_COLORS.positive}
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="spending"
                            name="spending"
                            fill={CHART_COLORS[0]}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </div>
                ) : (
                  <ChartEmptyState
                    icon={Wallet}
                    message="No activity yet"
                    height={220}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
      />
    </div>
  );
}
