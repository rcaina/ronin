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
        label: "Add Transaction",
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
        iconColor: "text-blue-500",
        valueColor: "text-blue-600",
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

    // Helper to get color based on group
    const getGroupColor = (group: CategoryType) => {
      switch (group) {
        case CategoryType.NEEDS:
          return "#3b82f6"; // blue-500
        case CategoryType.WANTS:
          return "#a855f7"; // purple-500
        case CategoryType.INVESTMENT:
          return "#22c55e"; // green-500
        default:
          return "#6b7280"; // gray-500
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
        color: "#3b82f6", // blue-500
      },
      {
        name: "Wants",
        value: groupAllocationMap.get(CategoryType.WANTS) ?? 0,
        color: "#a855f7", // purple-500
      },
      {
        name: "Investment",
        value: groupAllocationMap.get(CategoryType.INVESTMENT) ?? 0,
        color: "#22c55e", // green-500
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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

  const getGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-blue-500";
      case CategoryType.WANTS:
        return "bg-purple-500";
      case CategoryType.INVESTMENT:
        return "bg-green-500";
      default:
        return "bg-gray-500";
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
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mx-auto flex w-full flex-1 flex-col overflow-hidden px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
          {/* Charts and Summary Card - 4 items in one row */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-4">
            {/* Graph 1: All Categories by Allocated Amount (Pie Chart) */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                All Categories
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
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.allCategoriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(
                          value: number | undefined,
                          payload: unknown,
                        ) => {
                          if (value === undefined) return ["", ""];
                          const payloadData = payload as
                            | { payload?: { fullName?: string } }
                            | undefined;
                          const fullName = payloadData?.payload?.fullName ?? "";
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
                  <div className="mt-2 flex max-h-12 flex-wrap justify-center gap-1 overflow-y-auto text-[9px] sm:gap-2 sm:text-[10px]">
                    {chartData.allCategoriesData.slice(0, 6).map((item) => (
                      <div
                        key={item.fullName}
                        className="flex items-center gap-0.5"
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600">{item.name}</span>
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
                <div className="flex h-[160px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-8 w-8" />
                    <p className="text-xs">No allocations</p>
                  </div>
                </div>
              )}
            </div>

            {/* Graph 2: Spending vs Allocated by Group */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Spending vs Allocated
              </h3>
              {chartData.groupSpendingData.length > 0 ? (
                <ChartContainer height={160}>
                  <BarChart data={chartData.groupSpendingData}>
                    <XAxis
                      dataKey="name"
                      fontSize={8}
                      tick={{ fontSize: 8 }}
                      height={30}
                    />
                    <YAxis
                      tickFormatter={(value: unknown) =>
                        `$${typeof value === "number" ? (value / 1000).toFixed(0) + "k" : ""}`
                      }
                      fontSize={8}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return "";
                        return `$${value.toLocaleString()}`;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }}
                      content={({ payload }) => (
                        <div className="flex justify-center gap-4">
                          {payload?.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1.5"
                            >
                              <div
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  backgroundColor: entry.color,
                                  borderRadius: "2px",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "10px",
                                  color:
                                    entry.value === "Allocated"
                                      ? "#000000"
                                      : undefined,
                                }}
                              >
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <Bar
                      dataKey="allocated"
                      stackId="a"
                      fill="#e5e7eb"
                      name="Allocated"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      stackId="a"
                      fill="#8b5cf6"
                      name="Spent"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-8 w-8" />
                    <p className="text-xs">No data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Graph 3: Wants/Needs/Investments Allocation Pie Chart */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Allocation by Group
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
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.groupAllocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
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
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] sm:text-xs">
                    {chartData.groupAllocationData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Target className="mx-auto mb-1 h-8 w-8" />
                    <p className="text-xs">No allocations</p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Stats Card - Combined */}
            <div className="rounded-xl border bg-white p-2 shadow-sm sm:p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:text-sm">
                Summary
              </h3>
              <div className="space-y-2">
                {/* Allocation Status */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    {allocationStatus.icon}
                    <span className="text-[10px] text-gray-600 sm:text-xs">
                      Allocation
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-semibold sm:text-sm ${allocationStatus.valueColor}`}
                    >
                      {allocationStatus.value}
                    </div>
                    <div className="text-[9px] text-gray-500 sm:text-[10px]">
                      {allocationStatus.subtitle}
                    </div>
                  </div>
                </div>

                {/* Completed Categories */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-gray-600 sm:text-xs">
                      Completed
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-green-600 sm:text-sm">
                      {completedCategories}
                    </div>
                    <div className="text-[9px] text-gray-500 sm:text-[10px]">
                      of {totalCategories}
                    </div>
                  </div>
                </div>

                {/* Categories Over Budget */}
                <div className="group relative flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    {categoriesOverBudget > 0 ? (
                      <AlertCircle className="h-3 w-3 text-red-500 sm:h-4 sm:w-4" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    )}
                    <span className="text-[10px] text-gray-600 sm:text-xs">
                      Over Budget
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-semibold sm:text-sm ${
                        categoriesOverBudget > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {categoriesOverBudget}
                    </div>
                    <div className="text-[9px] text-gray-500 sm:text-[10px]">
                      {getOverBudgetSubtitle().text}
                    </div>
                  </div>

                  {/* Tooltip for over budget categories */}
                  {getOverBudgetSubtitle().tooltip && (
                    <div className="absolute left-1/2 top-full z-10 mt-2 min-w-[200px] -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                      <div className="mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-300" />
                        <span className="font-medium">
                          Categories Over Budget:
                        </span>
                      </div>
                      <div className="space-y-1">
                        {getOverBudgetSubtitle().tooltip!.map((cat, index) => (
                          <div
                            key={index}
                            className="flex justify-between gap-4 text-xs"
                          >
                            <span className="text-gray-200">{cat.name}</span>
                            <span className="text-red-300">
                              ${(cat.amount - (cat.allocated ?? 0)).toFixed(2)}{" "}
                              over
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-b-4 border-l-4 border-r-4 border-transparent border-b-gray-900"></div>
                    </div>
                  )}
                </div>

                {/* Total Income */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 text-green-500 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-gray-600 sm:text-xs">
                      Total Income
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-green-600 sm:text-sm">
                      ${totalIncome.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-gray-500 sm:text-[10px]">
                      Available
                    </div>
                  </div>
                </div>
              </div>
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

          <div className="min-h-0 flex-1">
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
