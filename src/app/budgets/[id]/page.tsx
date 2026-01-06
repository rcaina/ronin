"use client";

import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  EditIcon,
  Info,
  Plus,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import { useState, useEffect, useMemo } from "react";
import EditBudgetModal from "@/components/budgets/EditBudgetModal";
import { type CategoryType, TransactionType, CardType } from "@prisma/client";
import {
  formatDateUTC,
  getCategoryBadgeColor,
  getGroupColor,
  roundToCents,
} from "@/lib/utils";
import { useBudgetHeader } from "../../../../components/budgets/BudgetHeaderContext";
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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const BudgetDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isCardPaymentOpen, setIsCardPaymentOpen] = useState(false);
  const { data: budget, isLoading, error } = useBudget(id as string, true); // Exclude card payments for calculations
  const { setActions } = useBudgetHeader();

  // Register header actions
  useEffect(() => {
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add Transaction",
        onClick: () => setIsAddTransactionOpen(true),
        variant: "primary" as const,
      },
      {
        icon: <DollarSign className="h-4 w-4" />,
        label: "Pay Credit Card",
        onClick: () => setIsCardPaymentOpen(true),
        variant: "secondary" as const,
      },
    ]);
  }, [setActions]);

  // Calculate totals - moved before early returns
  // Calculate total income from INCOME transactions on debit cards
  const totalIncome = useMemo(() => {
    if (!budget) return 0;
    // Get all debit cards for this budget
    const debitCards = (budget.cards ?? []).filter(
      (card: { cardType: string }) =>
        card.cardType === CardType.DEBIT ||
        card.cardType === CardType.BUSINESS_DEBIT,
    );

    const debitCardIds = debitCards.map((card: { id: string }) => card.id);

    // Sum all INCOME transactions on debit cards
    return (budget.transactions ?? []).reduce((sum, transaction) => {
      if (
        transaction.transactionType === TransactionType.INCOME &&
        transaction.cardId &&
        debitCardIds.includes(transaction.cardId)
      ) {
        return sum + transaction.amount;
      }
      return sum;
    }, 0);
  }, [budget]);

  // Calculate total spent only from categorized transactions to match categories summary
  const totalSpent = useMemo(() => {
    if (!budget) return 0;
    return (budget.categories ?? []).reduce(
      (categoryTotal: number, category) => {
        const categorySpent = (category.transactions ?? []).reduce(
          (transactionTotal: number, transaction) => {
            // Exclude INCOME and CARD_PAYMENT transactions from spending
            if (
              transaction.transactionType === TransactionType.INCOME ||
              transaction.transactionType === TransactionType.CARD_PAYMENT
            ) {
              return transactionTotal;
            }
            if (transaction.transactionType === TransactionType.RETURN) {
              // Returns reduce spending (positive amount = refund received)
              return transactionTotal - transaction.amount;
            } else {
              // Regular transactions: positive = purchases (increase spending)
              return transactionTotal + transaction.amount;
            }
          },
          0,
        );
        return categoryTotal + categorySpent;
      },
      0,
    );
  }, [budget]);

  const totalRemaining = totalIncome - totalSpent;
  const spendingPercentage =
    totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

  // Prepare data for category-specific pie chart (actual spending)
  const categorySpendingData = useMemo(() => {
    if (!budget) return [];
    // Color palette for category pie chart
    const categoryColors = [
      "#3b82f6", // blue-500
      "#a855f7", // purple-500
      "#10b981", // green-500
      "#f59e0b", // amber-500
      "#ef4444", // red-500
      "#06b6d4", // cyan-500
      "#ec4899", // pink-500
      "#8b5cf6", // violet-500
      "#14b8a6", // teal-500
      "#f97316", // orange-500
    ];
    const categorySpending = (budget.categories ?? [])
      .map((category) => {
        const spent = (category.transactions ?? []).reduce(
          (sum, transaction) => {
            if (
              transaction.transactionType === TransactionType.INCOME ||
              transaction.transactionType === TransactionType.CARD_PAYMENT
            ) {
              return sum;
            }
            if (transaction.transactionType === TransactionType.RETURN) {
              return sum - transaction.amount;
            } else {
              return sum + transaction.amount;
            }
          },
          0,
        );
        return {
          name: category.name,
          value: roundToCents(spent),
          group: category.group,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories

    return categorySpending.map((item, index) => ({
      ...item,
      color: categoryColors[index % categoryColors.length],
    }));
  }, [budget]);

  // Prepare data for daily spending trend (last 7 days)
  const dailySpendingData = useMemo(() => {
    if (!budget) return [];
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySpending = (budget.categories ?? []).reduce((sum, category) => {
        return (
          sum +
          (category.transactions ?? []).reduce(
            (transactionSum, transaction) => {
              const transactionDate = new Date(transaction.createdAt);
              if (transactionDate >= date && transactionDate < nextDate) {
                if (
                  transaction.transactionType === TransactionType.INCOME ||
                  transaction.transactionType === TransactionType.CARD_PAYMENT
                ) {
                  return transactionSum;
                }
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

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      dailyData.push({
        day: dayName,
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        spending: roundToCents(daySpending),
      });
    }
    return dailyData;
  }, [budget]);

  // Prepare data for category usage (remaining vs allocated)
  const categoryUsageData = useMemo(() => {
    if (!budget) return [];
    return (budget.categories ?? [])
      .map((category) => {
        const spent = (category.transactions ?? []).reduce(
          (sum, transaction) => {
            if (
              transaction.transactionType === TransactionType.INCOME ||
              transaction.transactionType === TransactionType.CARD_PAYMENT
            ) {
              return sum;
            }
            if (transaction.transactionType === TransactionType.RETURN) {
              return sum - transaction.amount;
            } else {
              return sum + transaction.amount;
            }
          },
          0,
        );
        const allocated = category.allocatedAmount ?? 0;
        const remaining = allocated - spent;
        return {
          name:
            category.name.length > 12
              ? category.name.substring(0, 12) + "..."
              : category.name,
          fullName: category.name,
          allocated: roundToCents(allocated),
          remaining: roundToCents(Math.max(0, remaining)),
          spent: roundToCents(spent),
        };
      })
      .filter((item) => item.allocated > 0)
      .sort((a, b) => b.allocated - a.allocated)
      .slice(0, 5); // Top 5 categories by allocation
  }, [budget]);

  if (isLoading) {
    return <LoadingSpinner message="Loading budget..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <TrendingDown className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">Error loading budget</div>
          <div className="text-sm text-gray-500">{error.message}</div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <Target className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Budget not found</div>
        </div>
      </div>
    );
  }

  // Get budget status display
  const getBudgetStatusDisplay = () => {
    switch (budget.status) {
      case "ACTIVE":
        return {
          status: "Active",
          color: "text-green-600",
          bg: "bg-green-50",
          subtitle: "Budget is active",
        };
      case "COMPLETED":
        return {
          status: "Completed",
          color: "text-blue-600",
          bg: "bg-blue-50",
          subtitle: "Budget period finished",
        };
      case "ARCHIVED":
        return {
          status: "Archived",
          color: "text-gray-600",
          bg: "bg-gray-50",
          subtitle: "Budget is archived",
        };
      default:
        return {
          status: "Unknown",
          color: "text-gray-600",
          bg: "bg-gray-50",
          subtitle: "Status unknown",
        };
    }
  };

  const budgetStatusDisplay = getBudgetStatusDisplay();

  // Group categories by type and sort by usage percentage
  const categoriesByGroup = (budget.categories ?? []).reduce(
    (acc, budgetCategory) => {
      const group = budgetCategory.group.toLowerCase();
      acc[group] ??= [];
      acc[group].push(budgetCategory);
      return acc;
    },
    {} as Record<string, typeof budget.categories>,
  );

  // Sort categories within each group by usage percentage (100% used at bottom)
  Object.keys(categoriesByGroup).forEach((group) => {
    const categories = categoriesByGroup[group];
    if (categories) {
      categories.sort((a, b) => {
        const aSpent = (a.transactions ?? []).reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return sum - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return sum + transaction.amount;
          }
        }, 0);
        const bSpent = (b.transactions ?? []).reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return sum - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return sum + transaction.amount;
          }
        }, 0);

        const aPercentage =
          a.allocatedAmount && a.allocatedAmount > 0
            ? (aSpent / a.allocatedAmount) * 100
            : 0;
        const bPercentage =
          b.allocatedAmount && b.allocatedAmount > 0
            ? (bSpent / b.allocatedAmount) * 100
            : 0;

        // Sort by percentage ascending (100% used categories at bottom)
        return aPercentage - bPercentage;
      });
    }
  });

  const getGroupLabel = (group: string) => {
    switch (group) {
      case "needs":
        return "Needs";
      case "wants":
        return "Wants";
      case "investment":
        return "Investment";
      default:
        return group;
    }
  };

  return (
    <>
      <div className="flex flex-col lg:h-full lg:flex-col">
        <div className="mx-auto flex w-full flex-col px-2 py-4 pb-32 sm:px-4 sm:py-6 sm:pb-32 lg:flex-1 lg:overflow-hidden lg:px-8 lg:py-4">
          {/* Budget Overview Graphs */}
          <div className="mb-4 grid flex-shrink-0 grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-4 sm:gap-3 lg:gap-4">
            {/* Budget Progress Circular Progress Bar */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Budget Progress
              </h3>
              {totalIncome > 0 ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative" style={{ width: 120, height: 120 }}>
                    <svg
                      className="-rotate-90 transform"
                      width="120"
                      height="120"
                    >
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={
                          spendingPercentage > 100
                            ? "#ef4444"
                            : spendingPercentage === 100
                              ? "#10b981"
                              : "#8b5cf6"
                        }
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${
                          2 *
                          Math.PI *
                          50 *
                          (1 - Math.min(spendingPercentage, 100) / 100)
                        }`}
                        style={{
                          transition: "stroke-dashoffset 0.5s ease-in-out",
                        }}
                      />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-base font-bold text-gray-900 sm:text-lg">
                        {spendingPercentage.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-500 sm:text-xs">
                        Used
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[140px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-6 w-6" />
                    <p className="text-[10px]">No data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category Spending Pie Chart */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Category Spending
              </h3>
              {categorySpendingData.length > 0 ? (
                <>
                  <ChartContainer height={140}>
                    <PieChart>
                      <Pie
                        data={categorySpendingData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categorySpendingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(
                          value: number | undefined,
                          name?: string,
                        ) => {
                          if (value === undefined) return ["", name ?? ""];
                          const total = categorySpendingData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          );
                          const percentage =
                            total > 0 ? (value / total) * 100 : 0;
                          return [
                            `$${value.toLocaleString()} (${percentage.toFixed(1)}%)`,
                            name ?? "",
                          ];
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-1 flex flex-wrap justify-center gap-1 text-[9px] sm:text-[10px]">
                    {categorySpendingData.slice(0, 3).map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-0.5"
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600">
                          {item.name.length > 8
                            ? item.name.substring(0, 8) + "..."
                            : item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[140px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-6 w-6" />
                    <p className="text-[10px]">No spending</p>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Spending Trend */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Daily Spending
              </h3>
              {dailySpendingData.length > 0 &&
              dailySpendingData.some((d) => d.spending > 0) ? (
                <ChartContainer height={140}>
                  <LineChart data={dailySpendingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      fontSize={8}
                      tick={{ fontSize: 8 }}
                      height={25}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        `$${typeof value === "number" ? (value / 1000).toFixed(0) + "k" : ""}`
                      }
                      fontSize={8}
                      width={35}
                    />
                    <Tooltip
                      formatter={(
                        value: number | undefined,
                        payload: unknown,
                      ) => {
                        if (value === undefined) return "";
                        const payloadData = payload as
                          | { payload?: { date?: string } }
                          | undefined;
                        const date = payloadData?.payload?.date ?? "";
                        return [
                          `$${value.toLocaleString()}`,
                          date ? `Spending (${date})` : "Spending",
                        ];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="spending"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6", r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[140px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="mx-auto mb-1 h-6 w-6" />
                    <p className="text-[10px]">No data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category Usage Bar Chart */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Top Categories
              </h3>
              {categoryUsageData.length > 0 ? (
                <ChartContainer height={140}>
                  <BarChart data={categoryUsageData}>
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={40}
                      fontSize={7}
                      tick={{ fontSize: 7 }}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        `$${typeof value === "number" ? (value / 1000).toFixed(0) + "k" : ""}`
                      }
                      fontSize={7}
                      width={35}
                    />
                    <Tooltip
                      formatter={(
                        value: number | undefined,
                        name?: string,
                        payload?: unknown,
                      ) => {
                        if (value === undefined) return "";
                        const payloadData = payload as
                          | {
                              fullName?: string;
                              allocated?: number;
                              spent?: number;
                            }
                          | undefined;
                        return [
                          `$${value.toLocaleString()}`,
                          payloadData?.fullName ?? name ?? "Category",
                        ];
                      }}
                    />
                    <Bar
                      dataKey="remaining"
                      stackId="a"
                      fill="#e5e7eb"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      stackId="a"
                      fill="#8b5cf6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[140px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-6 w-6" />
                    <p className="text-[10px]">No categories</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Budget Details, Categories Summary, and Budget Summary - Three Columns */}
          <div className="mb-4 grid flex-shrink-0 grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-2 sm:gap-4 lg:mb-4 lg:grid-cols-3">
            {/* Budget Details */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                <h3 className="text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">
                  Budget Details
                </h3>
                <button
                  onClick={() => setIsEditBudgetOpen(true)}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Edit budget details"
                >
                  <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 sm:text-xs">
                    Strategy:
                  </span>
                  <p className="text-xs font-medium sm:text-sm">
                    {budget.strategy.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 sm:text-xs">
                    Period:
                  </span>
                  <p className="text-xs font-medium sm:text-sm">
                    {budget.period.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 sm:text-xs">
                    Start Date:
                  </span>
                  <p className="text-xs font-medium sm:text-sm">
                    {formatDateUTC(new Date(budget.startAt).toISOString())}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 sm:text-xs">
                    End Date:
                  </span>
                  <p className="text-xs font-medium sm:text-sm">
                    {formatDateUTC(new Date(budget.endAt).toISOString())}
                  </p>
                </div>
              </div>
            </div>

            {/* Categories Summary */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">
                  Categories Summary
                </h3>
                <button
                  onClick={() =>
                    router.push(`/budgets/${String(id)}/categories`)
                  }
                  className="text-[10px] font-medium text-blue-600 hover:text-blue-700 sm:text-xs"
                >
                  View Details
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(categoriesByGroup)
                  .filter(([group]) => group !== "card_payment")
                  .map(([group, categories]) => {
                    if (!categories || categories.length === 0) return null;

                    // Calculate totals for this group
                    const totalAllocated = roundToCents(
                      categories.reduce(
                        (sum, cat) => sum + (cat.allocatedAmount ?? 0),
                        0,
                      ),
                    );

                    const totalSpent = roundToCents(
                      categories.reduce((sum, cat) => {
                        const categorySpent = roundToCents(
                          (cat.transactions ?? []).reduce(
                            (transactionTotal: number, transaction) => {
                              // Exclude INCOME and CARD_PAYMENT transactions from spending
                              if (
                                transaction.transactionType ===
                                  TransactionType.INCOME ||
                                transaction.transactionType ===
                                  TransactionType.CARD_PAYMENT
                              ) {
                                return transactionTotal;
                              }
                              if (
                                transaction.transactionType ===
                                TransactionType.RETURN
                              ) {
                                return transactionTotal - transaction.amount;
                              } else {
                                return transactionTotal + transaction.amount;
                              }
                            },
                            0,
                          ),
                        );
                        return sum + categorySpent;
                      }, 0),
                    );

                    const usagePercentage = roundToCents(
                      totalAllocated > 0
                        ? (totalSpent / totalAllocated) * 100
                        : 0,
                    );

                    // Count categories that are 100% used
                    const fullyUsedCount = categories.filter((cat) => {
                      const categorySpent = roundToCents(
                        (cat.transactions ?? []).reduce(
                          (transactionTotal: number, transaction) => {
                            // Exclude INCOME and CARD_PAYMENT transactions from spending
                            if (
                              transaction.transactionType ===
                                TransactionType.INCOME ||
                              transaction.transactionType ===
                                TransactionType.CARD_PAYMENT
                            ) {
                              return transactionTotal;
                            }
                            if (
                              transaction.transactionType ===
                              TransactionType.RETURN
                            ) {
                              return transactionTotal - transaction.amount;
                            } else {
                              return transactionTotal + transaction.amount;
                            }
                          },
                          0,
                        ),
                      );
                      const categoryPercentage = roundToCents(
                        cat.allocatedAmount && cat.allocatedAmount > 0
                          ? (categorySpent / cat.allocatedAmount) * 100
                          : 0,
                      );
                      return categoryPercentage >= 100;
                    }).length;

                    return (
                      <div key={group} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <div
                              className={`h-2 w-2 rounded-full ${getGroupColor(group as CategoryType)}`}
                            ></div>
                            <span className="text-xs font-medium text-gray-900">
                              {getGroupLabel(group)}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              ({fullyUsedCount}/{categories.length})
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-900">
                              ${totalSpent.toLocaleString()} / $
                              {totalAllocated.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {usagePercentage.toFixed(1)}% used
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              usagePercentage === 100
                                ? "bg-green-500"
                                : usagePercentage > 100
                                  ? "bg-red-500"
                                  : "bg-secondary"
                            }`}
                            style={{
                              width: `${usagePercentage > 100 ? 100 : usagePercentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">
                Budget Summary
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-gray-500 sm:text-xs">
                      Total Income
                    </span>
                  </div>
                  <div className="text-sm font-bold text-gray-900 sm:text-base">
                    ${totalIncome.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {(() => {
                      const debitCards = (budget.cards ?? []).filter(
                        (card: { cardType: string }) =>
                          card.cardType === CardType.DEBIT ||
                          card.cardType === CardType.BUSINESS_DEBIT,
                      );
                      const debitCardIds = debitCards.map(
                        (card: { id: string }) => card.id,
                      );
                      const incomeTransactions = (
                        budget.transactions ?? []
                      ).filter(
                        (transaction) =>
                          transaction.transactionType ===
                            TransactionType.INCOME &&
                          transaction.cardId &&
                          debitCardIds.includes(transaction.cardId),
                      );
                      return incomeTransactions.length === 1
                        ? (incomeTransactions[0]?.name ?? "Income")
                        : `${incomeTransactions.length} income transactions`;
                    })()}
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <TrendingDown className="h-3 w-3 text-red-500 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-gray-500 sm:text-xs">
                      Total Spent
                    </span>
                  </div>
                  <div className="text-sm font-bold text-gray-900 sm:text-base">
                    ${totalSpent.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {spendingPercentage.toFixed(1)}% of budget
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-blue-500 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-gray-500 sm:text-xs">
                      Remaining
                    </span>
                  </div>
                  <div
                    className={`text-sm font-bold sm:text-base ${
                      totalRemaining >= 0 ? "text-gray-900" : "text-red-600"
                    }`}
                  >
                    ${totalRemaining.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {totalRemaining >= 0 ? "Available" : "Over budget"}
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <div
                      className={`h-3 w-3 rounded-full ${budgetStatusDisplay.bg} sm:h-4 sm:w-4`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${budgetStatusDisplay.color.replace("text-", "bg-")} m-0.5 sm:m-0.5 sm:h-2 sm:w-2`}
                      ></div>
                    </div>
                    <span className="text-[10px] text-gray-500 sm:text-xs">
                      Status
                    </span>
                  </div>
                  <div
                    className={`text-sm font-bold sm:text-base ${budgetStatusDisplay.color}`}
                  >
                    {budgetStatusDisplay.status}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                    {budgetStatusDisplay.subtitle}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Summary */}
          <div className="mb-4 flex min-h-0 flex-1 flex-col rounded-xl border bg-white p-3 shadow-sm sm:mb-4 sm:p-4">
            <div className="mb-3 flex flex-shrink-0 items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
                Recent Transactions
              </h3>
              <button
                onClick={() =>
                  router.push(`/budgets/${String(id)}/transactions`)
                }
                className="text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-sm"
              >
                View All
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {(() => {
                // Collect all transactions from all categories
                const allTransactions = (budget.categories ?? []).flatMap(
                  (cat) =>
                    (cat.transactions ?? []).map((transaction) => ({
                      ...transaction,
                      categoryName: cat.name,
                      categoryGroup: cat.group,
                    })),
                );

                if (allTransactions.length === 0) {
                  return (
                    <div className="py-6 text-center">
                      <p className="text-sm text-gray-500">
                        No transactions yet
                      </p>
                      <button
                        onClick={() => setIsAddTransactionOpen(true)}
                        className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Add your first transaction
                      </button>
                    </div>
                  );
                }

                // Sort by date and take the 5 most recent
                const recentTransactions = [...allTransactions]
                  .sort((a, b) => {
                    const dateA = a.occurredAt
                      ? new Date(a.occurredAt)
                      : new Date(a.createdAt);
                    const dateB = b.occurredAt
                      ? new Date(b.occurredAt)
                      : new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 5);

                return recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {transaction.name ?? "Unnamed Transaction"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            transaction.transactionType ===
                            TransactionType.CARD_PAYMENT
                              ? "bg-gray-200 text-gray-500"
                              : transaction.categoryName
                                ? getCategoryBadgeColor(
                                    transaction.categoryGroup,
                                  )
                                : getCategoryBadgeColor()
                          }`}
                        >
                          {transaction.transactionType ===
                          TransactionType.CARD_PAYMENT
                            ? "Card Payment"
                            : (transaction.categoryName ?? "No Category")}
                        </span>
                        {transaction.description && (
                          <div className="group relative flex-shrink-0">
                            <Info className="h-4 w-4 cursor-help text-gray-400" />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              {transaction.description}
                              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {transaction.occurredAt
                          ? formatDateUTC(
                              new Date(transaction.occurredAt).toISOString(),
                            )
                          : formatDateUTC(
                              new Date(transaction.createdAt).toISOString(),
                            )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          transaction.transactionType === TransactionType.RETURN
                            ? "text-green-600"
                            : ""
                        }`}
                      >
                        {transaction.transactionType === TransactionType.RETURN
                          ? "+"
                          : ""}
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      <div className="text-xs capitalize text-gray-500">
                        {transaction.transactionType
                          .toLowerCase()
                          .replace("_", " ")}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {isAddTransactionOpen && id && (
        <AddTransactionModal
          isOpen={isAddTransactionOpen}
          budgetId={id as string}
          onClose={() => setIsAddTransactionOpen(false)}
        />
      )}
      {isEditBudgetOpen && (
        <EditBudgetModal
          isOpen={isEditBudgetOpen}
          budget={budget}
          onClose={() => setIsEditBudgetOpen(false)}
        />
      )}
      {isCardPaymentOpen && (
        <CardPaymentModal
          isOpen={isCardPaymentOpen}
          onClose={() => setIsCardPaymentOpen(false)}
          budgetId={id as string}
        />
      )}
    </>
  );
};

export default BudgetDetailsPage;
