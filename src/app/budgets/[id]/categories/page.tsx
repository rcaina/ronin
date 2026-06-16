"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import BudgetCategoriesGridView from "@/components/budgets/BudgetCategoriesGridView";
import BudgetCategoriesViewToggle, {
  type BudgetCategoriesViewType,
} from "@/components/budgets/BudgetCategoriesViewToggle";
import BudgetCategoriesListView from "@/components/budgets/BudgetCategoriesListView";
import BudgetCategoriesSearch from "@/components/budgets/BudgetCategoriesSearch";
import { CategoryType, TransactionType, CardType } from "@prisma/client";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useBudgetCategories } from "@/lib/data-hooks/budgets/useBudgetCategories";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Target,
  AlertCircle,
  CheckCircle,
  DollarSign,
  HandCoins,
  Info,
  Plus,
} from "lucide-react";
import { roundToCents } from "@/lib/utils";
import { useBudgetHeader } from "../../../../../components/budgets/BudgetHeaderContext";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { ChartContainer } from "@/components/recharts/ChartWrapper";
import {
  CHART_COLORS,
  GROUP_COLORS,
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
  Legend,
} from "recharts";

// Renders allocated (back) and spent (front) at the same x so they overlap; height = amount
function OverlapBarShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { allocated: number; spent: number; name?: string };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const allocated = payload?.allocated ?? 0;
  const spent = payload?.spent ?? 0;
  const spentHeight =
    allocated > 0 ? (height * Math.max(0, spent)) / allocated : 0;
  const spentY = y + height - spentHeight;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#efeeeb"
        rx={4}
        ry={0}
      />
      <rect
        x={x}
        y={spentY}
        width={width}
        height={spentHeight}
        fill={CHART_COLORS[0]}
        rx={4}
        ry={0}
      />
    </g>
  );
}

const BudgetCategoriesPage = () => {
  const { id } = useParams();
  const budgetId = id as string;
  const {
    data: budget,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudget(budgetId);
  const [view, setView] = useState<BudgetCategoriesViewType>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const { setActions } = useBudgetHeader();

  // Register header actions
  useEffect(() => {
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add transaction",
        onClick: () => setIsAddTransactionOpen(true),
        variant: "primary" as const,
      },
    ]);
  }, [setActions]);

  // Use the search query in the hook
  const {
    data: budgetCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useBudgetCategories(budgetId, searchQuery);

  // Calculate allocation statistics
  // Calculate total income from INCOME transactions on debit cards
  const totalIncome = (() => {
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
  })();

  const totalAllocated =
    budget?.categories?.reduce(
      (sum, cat) => sum + (cat.allocatedAmount ?? 0),
      0,
    ) ?? 0;
  const allocationDifference = (totalIncome - totalAllocated).toFixed(2);

  // Calculate category statistics
  const totalCategories = budget?.categories?.length ?? 0;
  const completedCategories =
    budget?.categories?.filter((cat) => {
      const totalSpent = roundToCents(
        cat.transactions?.reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return sum - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return sum + transaction.amount;
          }
        }, 0) ?? 0,
      );
      return totalSpent >= (cat.allocatedAmount ?? 0);
    }).length ?? 0;

  // Calculate categories over budget and total amount over
  const overBudgetCategories =
    budget?.categories?.filter((cat) => {
      const totalSpent = roundToCents(
        cat.transactions?.reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            // Returns reduce spending (positive amount = refund received)
            return sum - transaction.amount;
          } else {
            // Regular transactions: positive = purchases (increase spending)
            return sum + transaction.amount;
          }
        }, 0) ?? 0,
      );
      return totalSpent > (cat.allocatedAmount ?? 0);
    }) ?? [];

  const categoriesOverBudget = overBudgetCategories.length;

  const totalOverBudget = roundToCents(
    budget?.categories?.reduce((sum, cat) => {
      const totalSpent = roundToCents(
        cat.transactions?.reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            return sum - transaction.amount;
          } else {
            return sum + transaction.amount;
          }
        }, 0) ?? 0,
      );
      const overAmount = Math.max(0, totalSpent - (cat.allocatedAmount ?? 0));
      return sum + overAmount;
    }, 0) ?? 0,
  );

  // Format category names for over budget display
  const getOverBudgetSubtitle = () => {
    if (categoriesOverBudget === 0) {
      return { text: "All within budget", tooltip: null };
    }

    if (categoriesOverBudget === 1) {
      return {
        text: `$${totalOverBudget.toFixed(2)} over - ${overBudgetCategories[0]?.name}`,
        tooltip: null,
      };
    }

    const othersCount = categoriesOverBudget - 1;
    return {
      text: `$${totalOverBudget.toFixed(2)} over ${othersCount} categories`,
      tooltip: overBudgetCategories.map((cat) => ({
        name: cat.name,
        amount: roundToCents(
          cat.transactions?.reduce((sum, transaction) => {
            if (transaction.transactionType === TransactionType.RETURN) {
              return sum - transaction.amount;
            } else {
              return sum + transaction.amount;
            }
          }, 0) ?? 0,
        ),
        allocated: cat.allocatedAmount,
      })),
    };
  };

  // Determine allocation status
  const getAllocationStatus = () => {
    if (totalAllocated.toFixed(2) === totalIncome.toFixed(2)) {
      return {
        value: "100%",
        subtitle: "allocated",
        icon: <CheckCircle className="h-4 w-4" />,
        iconColor: "text-green-500",
        valueColor: "text-green-600",
      };
    } else if (parseFloat(allocationDifference) > 0) {
      return {
        value: `$${allocationDifference}`,
        subtitle: "left to allocate",
        icon: <HandCoins className="h-4 w-4" />,
        iconColor: "text-secondary-600",
        valueColor: "text-secondary-700",
      };
    } else {
      // When over allocated, show the amount over allocated
      const overAllocationAmount = (totalAllocated - totalIncome).toFixed(2);
      return {
        value: `$${overAllocationAmount}`,
        subtitle: "over allocated",
        icon: <AlertCircle className="h-4 w-4" />,
        iconColor: "text-red-500",
        valueColor: "text-red-600",
      };
    }
  };

  const allocationStatus = getAllocationStatus();

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!budget?.categories) {
      return {
        allCategoriesData: [],
        groupAllocationData: [],
        groupSpendingData: [],
      };
    }

    // Helper to get color based on group (shared chart theme)
    const getGroupColor = (group: CategoryType) => {
      switch (group) {
        case CategoryType.NEEDS:
          return GROUP_COLORS.NEEDS!;
        case CategoryType.WANTS:
          return GROUP_COLORS.WANTS!;
        case CategoryType.INVESTMENT:
          return GROUP_COLORS.INVESTMENT!;
        default:
          return "#9ca3af";
      }
    };

    // 1. All Categories by Allocated Amount (Pie Chart)
    const allCategoriesData = budget.categories
      .filter((cat) => (cat.allocatedAmount ?? 0) > 0)
      .map((cat) => ({
        name:
          cat.name.length > 12 ? cat.name.substring(0, 12) + "..." : cat.name,
        fullName: cat.name,
        value: cat.allocatedAmount ?? 0,
        color: getGroupColor(cat.group),
      }))
      .sort((a, b) => b.value - a.value);

    // 2. Wants/Needs/Investments Allocation (Pie Chart)
    const groupAllocationMap = new Map<CategoryType, number>();
    budget.categories.forEach((cat) => {
      const allocated = cat.allocatedAmount ?? 0;
      const group = cat.group;
      const current = groupAllocationMap.get(group) ?? 0;
      groupAllocationMap.set(group, current + allocated);
    });

    const groupAllocationData = [
      {
        name: "Needs",
        value: groupAllocationMap.get(CategoryType.NEEDS) ?? 0,
        color: GROUP_COLORS.NEEDS!,
      },
      {
        name: "Wants",
        value: groupAllocationMap.get(CategoryType.WANTS) ?? 0,
        color: GROUP_COLORS.WANTS!,
      },
      {
        name: "Investment",
        value: groupAllocationMap.get(CategoryType.INVESTMENT) ?? 0,
        color: GROUP_COLORS.INVESTMENT!,
      },
    ].filter((item) => item.value > 0);

    // 3. Spending vs Allocated by Group (Stacked Bar Chart)
    const groupSpendingMap = new Map<
      CategoryType,
      { allocated: number; spent: number }
    >();

    budget.categories.forEach((cat) => {
      const allocated = cat.allocatedAmount ?? 0;
      const totalSpent = roundToCents(
        cat.transactions?.reduce((sum, transaction) => {
          if (transaction.transactionType === TransactionType.RETURN) {
            return sum - transaction.amount;
          } else {
            return sum + transaction.amount;
          }
        }, 0) ?? 0,
      );

      const group = cat.group;
      const current = groupSpendingMap.get(group) ?? { allocated: 0, spent: 0 };
      groupSpendingMap.set(group, {
        allocated: current.allocated + allocated,
        spent: current.spent + totalSpent,
      });
    });

    const groupSpendingData = [
      {
        name: "Needs",
        allocated: groupSpendingMap.get(CategoryType.NEEDS)?.allocated ?? 0,
        spent: groupSpendingMap.get(CategoryType.NEEDS)?.spent ?? 0,
      },
      {
        name: "Wants",
        allocated: groupSpendingMap.get(CategoryType.WANTS)?.allocated ?? 0,
        spent: groupSpendingMap.get(CategoryType.WANTS)?.spent ?? 0,
      },
      {
        name: "Investment",
        allocated:
          groupSpendingMap.get(CategoryType.INVESTMENT)?.allocated ?? 0,
        spent: groupSpendingMap.get(CategoryType.INVESTMENT)?.spent ?? 0,
      },
    ].filter((item) => item.allocated > 0 || item.spent > 0);

    return {
      allCategoriesData,
      groupAllocationData,
      groupSpendingData,
    };
  }, [budget]);

  // Show loading state while either budget or categories are loading
  if (budgetLoading || categoriesLoading) {
    return <LoadingSpinner message="Loading budget categories..." />;
  }

  // Show error state if there's an error with budget or categories
  if (budgetError || categoriesError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
            Error loading budget categories
          </div>
          <div className="text-sm text-gray-500">
            {budgetError && "message" in budgetError
              ? budgetError.message
              : categoriesError && "message" in categoriesError
                ? categoriesError.message
                : "An unexpected error occurred"}
          </div>
        </div>
      </div>
    );
  }

  // Show not found state if budget doesn't exist
  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
            <Target className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Budget not found
          </div>
        </div>
      </div>
    );
  }

  // Group accent classes derived from the shared chart theme (GROUP_COLORS)
  const getGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-[#5b7a9d]";
      case CategoryType.WANTS:
        return "bg-[#b9a15e]";
      case CategoryType.INVESTMENT:
        return "bg-[#6c9a8b]";
      default:
        return "bg-gray-400";
    }
  };

  const getGroupLabel = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "Needs";
      case CategoryType.WANTS:
        return "Wants";
      case CategoryType.INVESTMENT:
        return "Investment";
      default:
        return group;
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <>
      <div className="flex flex-col bg-surface lg:h-full lg:flex-col">
        <div className="mx-auto flex w-full flex-col px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:flex-1 lg:px-8 lg:py-4 lg:pb-8">
          {/* Charts and summary — swipeable row on mobile, grid on larger screens */}
          <div className="scrollbar-hide mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:mb-6 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-4">
            {/* Summary Stats Card - Combined */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Summary
              </h3>
              <div className="space-y-2">
                {/* Allocation Status */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    {allocationStatus.icon}
                    <span className="text-xs font-medium text-gray-500">
                      Allocation
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold tabular-nums ${allocationStatus.valueColor}`}
                    >
                      {allocationStatus.value}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {allocationStatus.subtitle}
                    </div>
                  </div>
                </div>

                {/* Completed Categories */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    <span className="text-xs font-medium text-gray-500">
                      Completed
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums text-green-600">
                      {completedCategories}
                    </div>
                    <div className="text-[10px] tabular-nums text-gray-500">
                      of {totalCategories}
                    </div>
                  </div>
                </div>

                {/* Categories Over Budget */}
                <div className="group relative flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    {categoriesOverBudget > 0 ? (
                      <AlertCircle className="h-3 w-3 text-red-500 sm:h-4 sm:w-4" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    )}
                    <span className="text-xs font-medium text-gray-500">
                      Over budget
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold tabular-nums ${
                        categoriesOverBudget > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {categoriesOverBudget}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {getOverBudgetSubtitle().text}
                    </div>
                  </div>

                  {/* Tooltip for over budget categories */}
                  {getOverBudgetSubtitle().tooltip && (
                    <div className="absolute left-1/2 top-full z-10 mt-2 min-w-[200px] -translate-x-1/2 transform whitespace-nowrap rounded-xl bg-primary-950/90 px-3 py-2 text-sm text-white opacity-0 shadow-lifted transition-opacity duration-200 group-hover:opacity-100">
                      <div className="mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-secondary-300" />
                        <span className="font-medium">
                          Categories over budget:
                        </span>
                      </div>
                      <div className="space-y-1">
                        {getOverBudgetSubtitle().tooltip!.map((cat, index) => (
                          <div
                            key={index}
                            className="flex justify-between gap-4 text-xs"
                          >
                            <span className="text-gray-200">{cat.name}</span>
                            <span className="tabular-nums text-red-300">
                              ${(cat.amount - (cat.allocated ?? 0)).toFixed(2)}{" "}
                              over
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-b-4 border-l-4 border-r-4 border-transparent border-b-primary-950/90"></div>
                    </div>
                  )}
                </div>

                {/* Total Income */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    <span className="text-xs font-medium text-gray-500">
                      Total income
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums text-green-600">
                      ${totalIncome.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500">Available</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Graph 1: All Categories by Allocated Amount (Donut Chart) */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                All categories
              </h3>
              {chartData.allCategoriesData.length > 0 ? (
                <>
                  <ChartContainer height={160}>
                    <PieChart>
                      <Pie
                        data={chartData.allCategoriesData}
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
                        {chartData.allCategoriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(
                          value: number | undefined,
                          _name: unknown,
                          entry: unknown,
                        ) => {
                          if (value === undefined) return ["", ""];
                          // Recharts passes the raw data point as entry.payload for Pie
                          const payload = (
                            entry as { payload?: { fullName?: string } }
                          )?.payload;
                          const fullName = payload?.fullName ?? "";
                          const total = chartData.allCategoriesData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          );
                          const percentage =
                            total > 0 ? (value / total) * 100 : 0;
                          return [
                            `$${value.toLocaleString()} (${percentage.toFixed(1)}%)`,
                            fullName || "Category",
                          ];
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-2 flex max-h-12 flex-wrap justify-center gap-x-3 gap-y-1 overflow-y-auto text-xs">
                    {chartData.allCategoriesData.slice(0, 6).map((item) => (
                      <div
                        key={item.fullName}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-500">{item.name}</span>
                      </div>
                    ))}
                    {chartData.allCategoriesData.length > 6 && (
                      <span className="text-gray-500">
                        +{chartData.allCategoriesData.length - 6} more
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <ChartEmptyState icon={Target} message="No allocations" />
              )}
            </div>

            {/* Graph 2: Spending vs Allocated by Group */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Spending vs allocated
              </h3>
              {chartData.groupSpendingData.length > 0 ? (
                <ChartContainer height={200}>
                  <BarChart
                    data={chartData.groupSpendingData}
                    barCategoryGap="20%"
                    barSize={56}
                  >
                    <XAxis
                      dataKey="name"
                      {...chartAxisProps}
                      fontSize={9}
                      height={24}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        typeof value === "number"
                          ? formatCompactCurrency(value)
                          : ""
                      }
                      {...chartAxisProps}
                      fontSize={9}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(185, 161, 94, 0.08)" }}
                      content={({ active, payload: tooltipPayload }) => {
                        type PayloadItem = {
                          payload?: {
                            name: string;
                            allocated: number;
                            spent: number;
                          };
                        };
                        const first = (
                          tooltipPayload as PayloadItem[] | undefined
                        )?.[0];
                        if (!active || !first?.payload) return null;
                        const {
                          name: groupName,
                          allocated,
                          spent,
                        } = first.payload;
                        return (
                          <div style={chartTooltipStyle}>
                            <div style={chartTooltipLabelStyle}>
                              {groupName}
                            </div>
                            <div style={chartTooltipItemStyle}>
                              Allocated: ${allocated.toLocaleString()}
                            </div>
                            <div style={chartTooltipItemStyle}>
                              Spent: ${spent.toLocaleString()}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }}
                      content={() => (
                        <div className="flex justify-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: CHART_COLORS[0],
                              }}
                            />
                            <span className="text-[10px] text-gray-500">
                              Spent
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: "#efeeeb",
                              }}
                            />
                            <span className="text-[10px] text-gray-500">
                              Allocated
                            </span>
                          </div>
                        </div>
                      )}
                    />
                    {/* Single bar per category: custom shape draws allocated (back) + spent (front) at same x */}
                    <Bar
                      dataKey="allocated"
                      name="Allocated"
                      shape={<OverlapBarShape />}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState icon={Target} message="No data yet" />
              )}
            </div>

            {/* Graph 3: Wants/Needs/Investments Allocation Donut Chart */}
            <div className="card-surface min-w-[16rem] snap-start p-4 sm:min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Allocation by group
              </h3>
              {chartData.groupAllocationData.length > 0 ? (
                <>
                  <ChartContainer height={160}>
                    <PieChart>
                      <Pie
                        data={chartData.groupAllocationData}
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
                        {chartData.groupAllocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(
                          value: number | undefined,
                          name?: string,
                        ) => {
                          if (value === undefined) return ["", name ?? ""];
                          const total = chartData.groupAllocationData.reduce(
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
                  <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                    {chartData.groupAllocationData.map((item) => (
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
                <ChartEmptyState icon={Target} message="No allocations" />
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <BudgetCategoriesSearch
                onSearchChange={handleSearchChange}
                searchQuery={searchQuery}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
              <BudgetCategoriesViewToggle view={view} onViewChange={setView} />
            </div>
          </div>

          <div className="lg:min-h-0 lg:flex-1">
            {view === "grid" ? (
              <BudgetCategoriesGridView
                budgetId={budgetId}
                getGroupColor={getGroupColor}
                getGroupLabel={getGroupLabel}
                budgetCategories={budgetCategories}
              />
            ) : (
              <BudgetCategoriesListView
                budgetId={budgetId}
                getGroupColor={getGroupColor}
                getGroupLabel={getGroupLabel}
                budgetCategories={budgetCategories}
              />
            )}
          </div>
        </div>
      </div>

      {isAddTransactionOpen && (
        <AddTransactionModal
          isOpen={isAddTransactionOpen}
          budgetId={budgetId}
          onClose={() => setIsAddTransactionOpen(false)}
        />
      )}
    </>
  );
};

export default BudgetCategoriesPage;
