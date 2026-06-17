"use client";

import { CategoryType, StrategyType } from "@prisma/client";
import { Target, PieChart, CheckCircle2, AlertTriangle } from "lucide-react";
import type { BudgetWithRelations } from "@/lib/types/budget";
import { formatCurrency, roundToCents } from "@/lib/utils";
import { calculateCategorySpent } from "@/lib/utils/spending";
import { GROUP_COLORS } from "@/components/recharts/theme";

// The 50/30/20 split, in income-share terms. Drives both the targets shown and
// the per-group adherence math below.
const GROUP_META: Array<{
  group: CategoryType;
  label: string;
  target: number;
}> = [
  { group: CategoryType.NEEDS, label: "Needs", target: 0.5 },
  { group: CategoryType.WANTS, label: "Wants", target: 0.3 },
  { group: CategoryType.INVESTMENT, label: "Investments", target: 0.2 },
];

// A group is "on target" when its allocated share is within this many
// percentage points of the 50/30/20 goal.
const ADHERENCE_TOLERANCE_PP = 5;

interface BudgetStrategyIndicatorProps {
  budget: BudgetWithRelations;
  totalIncome: number;
}

const groupTotals = (budget: BudgetWithRelations, group: CategoryType) => {
  const categories = (budget.categories ?? []).filter(
    (category) => category.group === group,
  );
  return {
    allocated: roundToCents(
      categories.reduce((sum, c) => sum + (c.allocatedAmount ?? 0), 0),
    ),
    spent: roundToCents(
      categories.reduce((sum, c) => sum + calculateCategorySpent(c), 0),
    ),
  };
};

const StatusChip = ({
  tone,
  icon,
  children,
}: {
  tone: "positive" | "warning" | "negative" | "neutral";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const toneClasses = {
    positive: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    negative: "bg-red-50 text-red-600",
    neutral: "bg-gray-100 text-gray-600",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses}`}
    >
      {icon}
      {children}
    </span>
  );
};

export default function BudgetStrategyIndicator({
  budget,
  totalIncome,
}: BudgetStrategyIndicatorProps) {
  const hasIncome = totalIncome > 0;

  if (budget.strategy === StrategyType.ZERO_SUM) {
    const totalAllocated = roundToCents(
      (budget.categories ?? []).reduce(
        (sum, c) => sum + (c.allocatedAmount ?? 0),
        0,
      ),
    );
    const unallocated = roundToCents(totalIncome - totalAllocated);
    const allocatedPct = hasIncome ? (totalAllocated / totalIncome) * 100 : 0;

    const status = !hasIncome
      ? {
          tone: "neutral" as const,
          icon: null,
          label: "Add income to track allocation",
          barColor: "bg-gray-300",
        }
      : Math.abs(unallocated) < 0.01
        ? {
            tone: "positive" as const,
            icon: <CheckCircle2 className="h-3 w-3" />,
            label: "Every dollar assigned",
            barColor: "bg-green-500",
          }
        : unallocated > 0
          ? {
              tone: "warning" as const,
              icon: <AlertTriangle className="h-3 w-3" />,
              label: `${formatCurrency(unallocated)} left to assign`,
              barColor: "bg-secondary",
            }
          : {
              tone: "negative" as const,
              icon: <AlertTriangle className="h-3 w-3" />,
              label: `${formatCurrency(Math.abs(unallocated))} over-allocated`,
              barColor: "bg-red-500",
            };

    return (
      <div className="card-surface mb-4 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-secondary-700" />
            <h3 className="text-sm font-semibold tracking-tight text-gray-900">
              Zero-based budgeting
            </h3>
          </div>
          <StatusChip tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusChip>
        </div>

        <div className="mb-2 grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs font-medium text-gray-500">Income</div>
            <div className="text-sm font-bold tabular-nums text-gray-900">
              {formatCurrency(totalIncome)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Allocated</div>
            <div className="text-sm font-bold tabular-nums text-gray-900">
              {formatCurrency(totalAllocated)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Unallocated</div>
            <div
              className={`text-sm font-bold tabular-nums ${
                unallocated < -0.01 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {formatCurrency(unallocated)}
            </div>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-out ${status.barColor}`}
            style={{ width: `${Math.min(Math.max(allocatedPct, 0), 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Zero-based budgeting works when income minus allocations equals zero —
          give every dollar a job.
        </p>
      </div>
    );
  }

  // 50/30/20 adherence
  return (
    <div className="card-surface mb-4 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-secondary-700" />
        <h3 className="text-sm font-semibold tracking-tight text-gray-900">
          50/30/20 rule
        </h3>
      </div>

      <div className="space-y-3">
        {GROUP_META.map(({ group, label, target }) => {
          const { allocated, spent } = groupTotals(budget, group);
          const targetPct = target * 100;
          const allocatedPct = hasIncome ? (allocated / totalIncome) * 100 : 0;
          const deviation = allocatedPct - targetPct;
          const onTarget = Math.abs(deviation) <= ADHERENCE_TOLERANCE_PP;
          const color = GROUP_COLORS[group] ?? "#9ca3af";

          return (
            <div key={group}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-gray-900">{label}</span>
                  <span className="text-gray-400">target {targetPct}%</span>
                </div>
                <div className="tabular-nums text-gray-500">
                  {formatCurrency(allocated)} ·{" "}
                  <span className="text-gray-400">
                    {formatCurrency(spent)} spent
                  </span>
                </div>
              </div>

              {/* Allocated share of income, with a marker at the target share. */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(Math.max(allocatedPct, 0), 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div className="relative h-0">
                <span
                  className="absolute top-[-10px] h-2.5 w-0.5 rounded-full bg-gray-500"
                  style={{ left: `${Math.min(targetPct, 100)}%` }}
                  aria-hidden
                />
              </div>

              <div className="mt-1 text-right text-[11px]">
                {hasIncome ? (
                  <StatusChip
                    tone={onTarget ? "positive" : "warning"}
                    icon={
                      onTarget ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )
                    }
                  >
                    {allocatedPct.toFixed(0)}% of income
                    {onTarget
                      ? " · on target"
                      : deviation > 0
                        ? ` · ${deviation.toFixed(0)}pp over`
                        : ` · ${Math.abs(deviation).toFixed(0)}pp under`}
                  </StatusChip>
                ) : (
                  <StatusChip tone="neutral">Add income to track</StatusChip>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Bars show each group&apos;s allocated share of income; the marker is the
        50/30/20 target.
      </p>
    </div>
  );
}
