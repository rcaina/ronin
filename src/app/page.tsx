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
      color: "#ef4444", // red-500
    },
    {
      name: "Remaining",
      value: Math.max(0, totalRemaining),
      color: "#3b82f6", // blue-500
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
      let statusColor = "#10b981"; // green
      if (utilization > 90) {
        statusColor = "#ef4444"; // red
      } else if (utilization > 75) {
        statusColor = "#f59e0b"; // yellow/amber
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
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "User"}! 👋`}
        description={`Here's your financial overview for ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
      />

      <div className="flex-1 overflow-hidden pt-4 sm:pt-20 lg:pt-0">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full px-2 py-2 sm:px-4 sm:py-3 lg:px-8 lg:py-2">
            {/* Financial Overview Charts */}
            <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:grid-cols-4 sm:gap-3 lg:gap-4">
              {/* Income Breakdown Pie Chart */}
              <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
                <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                  Income Breakdown
                </h3>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 sm:text-xs">
                      Total Income
                    </p>
                    <p className="text-sm font-bold text-green-600 sm:text-base">
                      ${totalIncome.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 sm:text-xs">
                      Spent
                    </p>
                    <p className="text-sm font-bold text-red-600 sm:text-base">
                      ${totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>
                <ChartContainer height={140}>
                  <PieChart>
                    <Pie
                      data={incomeBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        percent ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                      }
                    >
                      {incomeBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) =>
                        value !== undefined ? `$${value.toLocaleString()}` : ""
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Spending by Category Bar Chart */}
              <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
                <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                  Top Spending Categories
                </h3>
                {categorySpendingData.length > 0 ? (
                  <ChartContainer height={140}>
                    <BarChart data={categorySpendingData}>
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        fontSize={10}
                      />
                      <YAxis
                        tickFormatter={(value: unknown) =>
                          typeof value === "number"
                            ? `$${value.toLocaleString()}`
                            : String(value)
                        }
                        fontSize={10}
                      />
                      <Tooltip
                        formatter={(value: unknown) =>
                          typeof value === "number"
                            ? `$${value.toLocaleString()}`
                            : String(value)
                        }
                      />
                      <Bar
                        dataKey="value"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[140px] items-center justify-center">
                    <p className="text-[10px] text-gray-500 sm:text-xs">
                      No spending data available
                    </p>
                  </div>
                )}
              </div>

              {/* Spending by Budget Period Bar Chart */}
              <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
                <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                  Spending by Budget Period
                </h3>
                {periodSpendingData.length > 0 ? (
                  <ChartContainer height={140}>
                    <BarChart data={periodSpendingData}>
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        fontSize={10}
                      />
                      <YAxis
                        tickFormatter={(value: unknown) =>
                          typeof value === "number"
                            ? `$${value.toLocaleString()}`
                            : String(value)
                        }
                        fontSize={10}
                      />
                      <Tooltip
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
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[140px] items-center justify-center">
                    <p className="text-[10px] text-gray-500 sm:text-xs">
                      No spending data available
                    </p>
                  </div>
                )}
              </div>

              {/* Budget Utilization & Time Remaining Bar Chart */}
              <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
                <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                  Budget Utilization & Time
                </h3>
                {budgetUtilizationData.length > 0 ? (
                  <ChartContainer height={140}>
                    <BarChart
                      data={budgetUtilizationData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 60, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={(value: unknown) =>
                          typeof value === "number"
                            ? `$${value.toLocaleString()}`
                            : String(value)
                        }
                        fontSize={10}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={55}
                        fontSize={10}
                      />
                      <Tooltip
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
                              "Days Remaining",
                            ];
                          }
                          return [String(value), name ?? ""];
                        }}
                        labelFormatter={(label) => `Budget: ${label}`}
                      />
                      <Bar dataKey="remaining" radius={[0, 4, 4, 0]}>
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
                  <div className="flex h-[140px] items-center justify-center">
                    <p className="text-[10px] text-gray-500 sm:text-xs">
                      No budget data available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-4">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4">
                  <div className="mb-2 flex flex-col items-start justify-between gap-2 sm:mb-3 sm:flex-row sm:items-center">
                    <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                      Recent Activity
                    </h2>
                    <Link
                      href="/transactions"
                      className="flex items-center space-x-1 text-[10px] text-secondary hover:text-primary sm:text-xs"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-3 w-3 sm:h-3 sm:w-3" />
                    </Link>
                  </div>

                  {recentTransactions.length > 0 ? (
                    <div className="space-y-2 sm:space-y-2">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-2 sm:p-2.5"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-2">
                            <div className="bg-secondary/10 flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7">
                              <Receipt className="h-3 w-3 text-secondary sm:h-3.5 sm:w-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-900 sm:text-sm">
                                {transaction.name ?? "Unnamed transaction"}
                              </p>
                              <p className="text-[10px] text-gray-500 sm:text-xs">
                                {transaction.category?.name ?? "No Category"}•{" "}
                                {new Date(
                                  transaction.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-900 sm:text-sm">
                              ${Number(transaction.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center sm:py-5">
                      <Receipt className="mx-auto mb-2 h-6 w-6 text-gray-300 sm:mb-2 sm:h-8 sm:w-8" />
                      <p className="text-xs text-gray-500 sm:text-sm">
                        No recent transactions
                      </p>
                      <p className="text-[10px] text-gray-400 sm:text-xs">
                        Start adding transactions to see them here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions & Insights */}
              <div className="space-y-3 sm:space-y-3">
                {/* Quick Actions */}
                <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4">
                  <h2 className="mb-2 text-sm font-semibold text-gray-900 sm:mb-3 sm:text-base">
                    Quick Actions
                  </h2>
                  <div className="space-y-1.5 sm:space-y-2">
                    {mostRecentBudget && (
                      <button
                        onClick={() =>
                          router.push(`/budgets/${mostRecentBudget.id}`)
                        }
                        className="group flex w-full items-center space-x-2 rounded-lg border p-1.5 text-left transition-colors hover:bg-accent sm:space-x-2 sm:p-2"
                      >
                        <div className="bg-secondary/10 flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7">
                          <Target className="h-3.5 w-3.5 text-secondary group-hover:text-white sm:h-4 sm:w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">
                            Current Budget
                          </p>
                          <p className="text-[10px] text-gray-500 sm:text-xs">
                            {mostRecentBudget.name}
                          </p>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => router.push("/budgets")}
                      className="flex w-full items-center space-x-2 rounded-lg border p-1.5 text-left transition-colors hover:bg-accent sm:space-x-2 sm:p-2"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 sm:h-7 sm:w-7">
                        <Plus className="h-3 w-3 text-blue-600 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">
                          Create Budget
                        </p>
                        <p className="text-[10px] text-gray-500 sm:text-xs">
                          Set up a new budget plan
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => router.push("/transactions")}
                      className="flex w-full items-center space-x-2 rounded-lg border p-1.5 text-left transition-colors hover:bg-accent sm:space-x-2 sm:p-2"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 sm:h-7 sm:w-7">
                        <Receipt className="h-3 w-3 text-green-600 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">
                          Add Transaction
                        </p>
                        <p className="text-[10px] text-gray-500 sm:text-xs">
                          Record a new expense
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Financial Tips */}
                <div className="from-secondary/10 rounded-xl border bg-gradient-to-br to-blue-500/10 p-3 sm:p-4">
                  <div className="mb-1.5 flex items-center space-x-2 sm:mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-secondary sm:h-4 sm:w-4" />
                    <h3 className="text-xs font-semibold text-gray-900 sm:text-sm">
                      Financial Tip
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-600 sm:text-xs">
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
