"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useAllTransactions } from "@/lib/data-hooks/transactions/useTransactions";
import { Target, Plus, ArrowRight, Receipt, Sparkles } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  CHART_COLORS,
  STATUS_COLORS,
  ChartEmptyState,
  chartAxisProps,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  formatCompactCurrency,
} from "@/components/recharts/theme";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  TransactionType,
  CardType,
  BudgetStatus,
  PeriodType,
} from "@prisma/client";
import { roundToCents } from "@/lib/utils";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(
    undefined,
    true,
  ); // Exclude card payments for calculations

  const { data: transactions = [], isLoading: transactionsLoading } =
    useAllTransactions();

  if (status === "loading" || budgetsLoading || transactionsLoading) {
    return <LoadingSpinner message="Loading your financial overview..." />;
  }

  // Filter out deleted and archived budgets
  const activeBudgets = budgets.filter(
    (budget) => !budget.deleted && budget.status !== BudgetStatus.ARCHIVED,
  );

  // Calculate financial metrics

  const totalIncome = roundToCents(
    activeBudgets.reduce((sum, budget) => {
      // Get all debit cards for this budget
      const debitCards = (budget.cards ?? []).filter(
        (card: { cardType: string }) =>
          card.cardType === CardType.DEBIT ||
          card.cardType === CardType.BUSINESS_DEBIT,
      );
      const debitCardIds = debitCards.map((card: { id: string }) => card.id);

      // Sum all INCOME transactions on debit cards
      const budgetIncome = (budget.transactions ?? []).reduce(
        (incomeSum, transaction) => {
          if (
            transaction.transactionType === TransactionType.INCOME &&
            transaction.cardId &&
            debitCardIds.includes(transaction.cardId)
          ) {
            return incomeSum + transaction.amount;
          }
          return incomeSum;
        },
        0,
      );

      return sum + budgetIncome;
    }, 0),
  );

  const totalSpent = roundToCents(
    activeBudgets.reduce((sum, budget) => {
      return (
        sum +
        (budget.categories ?? []).reduce((categorySum, category) => {
          return (
            categorySum +
            (category.transactions ?? []).reduce(
              (transactionSum, transaction) => {
                if (transaction.transactionType === TransactionType.RETURN) {
                  // Returns reduce spending (positive amount = refund received)
                  return transactionSum - transaction.amount;
                } else {
                  // Regular transactions: positive = purchases (increase spending)
                  return transactionSum + transaction.amount;
                }
              },
              0,
            )
          );
        }, 0)
      );
    }, 0),
  );

  const totalRemaining = roundToCents(totalIncome - totalSpent);
  const spendingPercentage = roundToCents(
    totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0,
  );

  // Prepare data for pie chart (Income vs Spent vs Remaining)
  const incomeBreakdownData = [
    {
      name: "Spent",
      value: totalSpent,
      color: CHART_COLORS[0], // brand gold
    },
    {
      name: "Remaining",
      value: Math.max(0, totalRemaining),
      color: CHART_COLORS[2], // sage
    },
  ];

  // Prepare data for spending by category
  const categorySpendingMap = new Map<string, number>();
  activeBudgets.forEach((budget) => {
    (budget.categories ?? []).forEach((category) => {
      const categorySpent = (category.transactions ?? []).reduce(
        (sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            return sum - transaction.amount;
          } else {
            return sum + transaction.amount;
          }
        },
        0,
      );
      if (categorySpent > 0) {
        const current = categorySpendingMap.get(category.name) ?? 0;
        categorySpendingMap.set(category.name, current + categorySpent);
      }
    });
  });

  const categorySpendingData = Array.from(categorySpendingMap.entries())
    .map(([name, value]) => ({
      name,
      value: roundToCents(value),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 categories

  // Prepare data for spending by budget period
  const periodSpendingData = activeBudgets
    .map((budget) => {
      const periodStart = new Date(budget.startAt);
      const periodEnd = new Date(budget.endAt);
      const now = new Date();

      // Calculate income for this budget
      const debitCards = (budget.cards ?? []).filter(
        (card: { cardType: string }) =>
          card.cardType === CardType.DEBIT ||
          card.cardType === CardType.BUSINESS_DEBIT,
      );
      const debitCardIds = debitCards.map((card: { id: string }) => card.id);

      const budgetIncome = (budget.transactions ?? []).reduce(
        (incomeSum, transaction) => {
          if (
            transaction.transactionType === TransactionType.INCOME &&
            transaction.cardId &&
            debitCardIds.includes(transaction.cardId)
          ) {
            return incomeSum + transaction.amount;
          }
          return incomeSum;
        },
        0,
      );

      // Calculate spent within this budget's period
      const periodSpent = (budget.categories ?? []).reduce((sum, category) => {
        return (
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum, transaction) => {
              const transactionDate = new Date(transaction.createdAt);
              // Only count transactions within the budget period
              if (
                transactionDate >= periodStart &&
                transactionDate <= periodEnd
              ) {
                if (transaction.transactionType === TransactionType.RETURN) {
                  return transactionSum - transaction.amount;
                } else {
                  return transactionSum + transaction.amount;
                }
              }
              return transactionSum;
            },
            0,
          )
        );
      }, 0);

      // Calculate period progress
      const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
      const elapsedMs = now.getTime() - periodStart.getTime();
      const progress = Math.min(
        100,
        Math.max(0, (elapsedMs / totalPeriodMs) * 100),
      );

      // Format period label
      const periodLabel =
        budget.period === PeriodType.WEEKLY
          ? "Weekly"
          : budget.period === PeriodType.MONTHLY
            ? "Monthly"
            : budget.period === PeriodType.QUARTERLY
              ? "Quarterly"
              : budget.period === PeriodType.YEARLY
                ? "Yearly"
                : "One-Time";

      return {
        name:
          budget.name.length > 12
            ? budget.name.substring(0, 12) + "..."
            : budget.name,
        period: periodLabel,
        spent: roundToCents(periodSpent),
        income: roundToCents(budgetIncome),
        progress: roundToCents(progress),
        utilization:
          budgetIncome > 0
            ? roundToCents((periodSpent / budgetIncome) * 100)
            : 0,
      };
    })
    .filter((item) => item.income > 0 || item.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8); // Top 8 budgets by spending

  // Prepare data for budget utilization & time remaining
  const budgetUtilizationData = activeBudgets
    .map((budget) => {
      const periodStart = new Date(budget.startAt);
      const periodEnd = new Date(budget.endAt);
      const now = new Date();

      // Calculate income for this budget
      const debitCards = (budget.cards ?? []).filter(
        (card: { cardType: string }) =>
          card.cardType === CardType.DEBIT ||
          card.cardType === CardType.BUSINESS_DEBIT,
      );
      const debitCardIds = debitCards.map((card: { id: string }) => card.id);

      const budgetIncome = (budget.transactions ?? []).reduce(
        (incomeSum, transaction) => {
          if (
            transaction.transactionType === TransactionType.INCOME &&
            transaction.cardId &&
            debitCardIds.includes(transaction.cardId)
          ) {
            return incomeSum + transaction.amount;
          }
          return incomeSum;
        },
        0,
      );

      // Calculate spent for this budget
      const budgetSpent = (budget.categories ?? []).reduce((sum, category) => {
        return (
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum, transaction) => {
              if (transaction.transactionType === TransactionType.RETURN) {
                return transactionSum - transaction.amount;
              } else {
                return transactionSum + transaction.amount;
              }
            },
            0,
          )
        );
      }, 0);

      // Calculate time remaining
      const daysTotal = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysElapsed = Math.max(
        0,
        Math.ceil(
          (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const daysRemaining = Math.max(0, daysTotal - daysElapsed);

      const remaining = roundToCents(Math.max(0, budgetIncome - budgetSpent));
      const utilization =
        budgetIncome > 0 ? roundToCents((budgetSpent / budgetIncome) * 100) : 0;

      // Determine status color
      let statusColor: string = STATUS_COLORS.positive;
      if (utilization > 90) {
        statusColor = STATUS_COLORS.negative;
      } else if (utilization > 75) {
        statusColor = STATUS_COLORS.warning;
      }

      return {
        name:
          budget.name.length > 10
            ? budget.name.substring(0, 10) + "..."
            : budget.name,
        remaining: remaining,
        utilization: utilization,
        daysRemaining: daysRemaining,
        spent: roundToCents(budgetSpent),
        income: roundToCents(budgetIncome),
        statusColor: statusColor,
      };
    })
    .filter((item) => item.income > 0 || item.spent > 0)
    .sort((a, b) => b.utilization - a.utilization) // Sort by utilization (highest first)
    .slice(0, 8); // Top 8 budgets

  // Get recent transactions (last 5, excluding card payments)
  const recentTransactions = transactions
    .filter(
      (transaction) =>
        transaction.transactionType !== TransactionType.CARD_PAYMENT,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  // Get the most recent budget for the quick action
  const mostRecentBudget = activeBudgets.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  return (
    <div className="flex h-screen flex-col bg-surface">
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "User"}! 👋`}
        description={`Here's your financial overview for ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
      />

      <div className="flex-1 overflow-hidden pt-4 sm:pt-20 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 lg:px-8 lg:pb-8">
            {/* Financial Overview Charts — swipeable row on mobile, grid on larger screens */}
            <div className="scrollbar-hide mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
              {/* Income Breakdown Donut Chart */}
              <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Income breakdown
                </h3>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Total income
                    </p>
                    <p className="text-sm font-bold tabular-nums tracking-tight text-green-600 sm:text-base">
                      ${totalIncome.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500">Spent</p>
                    <p className="text-sm font-bold tabular-nums tracking-tight text-gray-900 sm:text-base">
                      ${totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>
                {totalIncome > 0 || totalSpent > 0 ? (
                  <>
                    <ChartContainer height={130}>
                      <PieChart>
                        <Pie
                          data={incomeBreakdownData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          innerRadius={38}
                          outerRadius={58}
                          paddingAngle={3}
                          cornerRadius={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {incomeBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                          formatter={(value: number | undefined) =>
                            value !== undefined
                              ? `$${value.toLocaleString()}`
                              : ""
                          }
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                      {incomeBreakdownData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-1.5"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-500">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <ChartEmptyState icon={Target} message="No data yet" />
                )}
              </div>

              {/* Spending by Category Bar Chart */}
              <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Top spending categories
                </h3>
                {categorySpendingData.length > 0 ? (
                  <ChartContainer height={200}>
                    <BarChart data={categorySpendingData}>
                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        height={48}
                        {...chartAxisProps}
                        fontSize={9}
                      />
                      <YAxis
                        tickFormatter={(value: unknown) =>
                          typeof value === "number"
                            ? formatCompactCurrency(value)
                            : ""
                        }
                        {...chartAxisProps}
                        fontSize={9}
                        width={42}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(185, 161, 94, 0.08)" }}
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(value: unknown) =>
                          typeof value === "number"
                            ? `$${value.toLocaleString()}`
                            : String(value)
                        }
                      />
                      <Bar
                        dataKey="value"
                        fill={CHART_COLORS[0]}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <ChartEmptyState icon={Receipt} message="No spending yet" />
                )}
              </div>

              {/* Spending by Budget Period Bar Chart */}
              <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Spending by budget period
                </h3>
                {periodSpendingData.length > 0 ? (
                  <ChartContainer height={200}>
                    <BarChart data={periodSpendingData}>
                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        height={48}
                        {...chartAxisProps}
                        fontSize={9}
                      />
                      <YAxis
                        tickFormatter={(value: unknown) =>
                          typeof value === "number"
                            ? formatCompactCurrency(value)
                            : ""
                        }
                        {...chartAxisProps}
                        fontSize={9}
                        width={42}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(185, 161, 94, 0.08)" }}
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(value: unknown, name?: string) => {
                          if (name === "spent") {
                            return typeof value === "number"
                              ? [`$${value.toLocaleString()}`, "Spent"]
                              : [String(value), "Spent"];
                          }
                          if (name === "utilization") {
                            return typeof value === "number"
                              ? [`${value.toFixed(1)}%`, "Utilization"]
                              : [String(value), "Utilization"];
                          }
                          return [String(value), name ?? ""];
                        }}
                        labelFormatter={(label) => `Budget: ${label}`}
                      />
                      <Bar
                        dataKey="spent"
                        fill={CHART_COLORS[0]}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <ChartEmptyState icon={Target} message="No spending yet" />
                )}
              </div>

              {/* Budget Utilization & Time Remaining Bar Chart */}
              <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Budget utilization & time
                </h3>
                {budgetUtilizationData.length > 0 ? (
                  <ChartContainer height={200}>
                    <BarChart
                      data={budgetUtilizationData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 60, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={(value: unknown) =>
                          typeof value === "number"
                            ? formatCompactCurrency(value)
                            : ""
                        }
                        {...chartAxisProps}
                        fontSize={9}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={55}
                        {...chartAxisProps}
                        fontSize={9}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(185, 161, 94, 0.08)" }}
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(value: unknown, name?: string) => {
                          if (name === "remaining") {
                            return typeof value === "number"
                              ? [`$${value.toLocaleString()}`, "Remaining"]
                              : [String(value), "Remaining"];
                          }
                          if (name === "utilization") {
                            return typeof value === "number"
                              ? [`${value.toFixed(1)}%`, "Utilization"]
                              : [String(value), "Utilization"];
                          }
                          if (name === "daysRemaining") {
                            const numValue =
                              typeof value === "number" ? value : 0;
                            return [
                              `${numValue} day${numValue !== 1 ? "s" : ""}`,
                              "Days remaining",
                            ];
                          }
                          return [String(value), name ?? ""];
                        }}
                        labelFormatter={(label) => `Budget: ${label}`}
                      />
                      <Bar dataKey="remaining" radius={[0, 6, 6, 0]}>
                        {budgetUtilizationData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.statusColor}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <ChartEmptyState icon={Target} message="No budgets yet" />
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-4">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <div className="card-surface p-4 sm:p-5">
                  <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Recent activity
                    </h2>
                    <Link
                      href="/transactions"
                      className="flex items-center gap-1 text-xs font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
                    >
                      <span>View all</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {recentTransactions.length > 0 ? (
                    <div className="space-y-2">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between rounded-xl bg-surface p-2 sm:p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10">
                              <Receipt className="h-3.5 w-3.5 text-secondary-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-900 sm:text-sm">
                                {transaction.name ?? "Unnamed transaction"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transaction.category?.name ?? "No category"} •{" "}
                                {new Date(
                                  transaction.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium tabular-nums text-gray-900 sm:text-sm">
                              ${Number(transaction.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-5 text-center">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                        <Receipt className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm text-gray-500">
                        No recent transactions
                      </p>
                      <p className="text-xs text-gray-400">
                        Start adding transactions to see them here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions & Insights */}
              <div className="space-y-3 sm:space-y-4">
                {/* Quick Actions */}
                <div className="card-surface p-4 sm:p-5">
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">
                    Quick actions
                  </h2>
                  <div className="space-y-2">
                    {mostRecentBudget && (
                      <button
                        onClick={() =>
                          router.push(`/budgets/${mostRecentBudget.id}`)
                        }
                        className="flex w-full items-center gap-2 rounded-xl border border-gray-200/70 p-2 text-left transition-all duration-200 ease-out hover:bg-secondary/10 active:scale-[0.98]"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10">
                          <Target className="h-3.5 w-3.5 text-secondary-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">
                            Current budget
                          </p>
                          <p className="text-xs text-gray-500">
                            {mostRecentBudget.name}
                          </p>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => router.push("/budgets")}
                      className="flex w-full items-center gap-2 rounded-xl border border-gray-200/70 p-2 text-left transition-all duration-200 ease-out hover:bg-secondary/10 active:scale-[0.98]"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10">
                        <Plus className="h-3.5 w-3.5 text-secondary-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">
                          Create budget
                        </p>
                        <p className="text-xs text-gray-500">
                          Set up a new budget plan
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => router.push("/transactions")}
                      className="flex w-full items-center gap-2 rounded-xl border border-gray-200/70 p-2 text-left transition-all duration-200 ease-out hover:bg-secondary/10 active:scale-[0.98]"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10">
                        <Receipt className="h-3.5 w-3.5 text-secondary-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">
                          Add transaction
                        </p>
                        <p className="text-xs text-gray-500">
                          Record a new expense
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Financial Tips */}
                <div className="rounded-2xl border border-gray-200/70 bg-gradient-to-br from-secondary/10 to-accent/20 p-4 shadow-card sm:p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-secondary-600" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Financial tip
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600">
                    {spendingPercentage > 90
                      ? "You're over budget! Consider reviewing your spending habits and cutting back on non-essential expenses."
                      : spendingPercentage > 75
                        ? "You're approaching your budget limit. Keep an eye on your spending to stay on track."
                        : "Great job staying within your budget! You're on track to meet your financial goals."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
