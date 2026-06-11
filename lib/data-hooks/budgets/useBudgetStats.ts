import { useMemo } from "react";
import { CategoryType } from "@prisma/client";
import type { BudgetWithRelations } from "@/lib/types/budget";
import { roundToCents } from "@/lib/utils";
import {
  calculateBudgetSpent,
  calculateCategorySpent,
  calculateDailySpending,
  calculateRecentSpending,
  calculateSpendingPercentage,
  calculateTotalIncome,
  flattenBudgetTransactions,
} from "@/lib/utils/spending";

import { CHART_COLORS, GROUP_COLORS } from "@/components/recharts/theme";

// Palette for the per-category pie chart on the budget detail page.
const CATEGORY_COLORS = CHART_COLORS;

/**
 * Aggregate statistics for the budgets list page, computed across the active
 * budgets (with completed/archived only contributing to counts).
 */
export const useBudgetStats = (
  activeBudgets: BudgetWithRelations[],
  completedBudgets: BudgetWithRelations[],
  archivedBudgets: BudgetWithRelations[],
) =>
  useMemo(() => {
    const totalBudgets =
      activeBudgets.length + completedBudgets.length + archivedBudgets.length;

    const totalIncome = activeBudgets.reduce(
      (sum, budget) => sum + calculateTotalIncome(budget),
      0,
    );
    const totalSpent = activeBudgets.reduce(
      (sum, budget) => sum + calculateBudgetSpent(budget),
      0,
    );
    const totalRemaining = totalIncome - totalSpent;
    const overallSpendingPercentage = calculateSpendingPercentage(
      totalSpent,
      totalIncome,
    );

    // Spending grouped by category group (Needs / Wants / Investment).
    const spendingByGroup = activeBudgets.reduce(
      (acc, budget) => {
        (budget.categories ?? []).forEach((category) => {
          const group = category.group ?? CategoryType.NEEDS;
          acc[group] = (acc[group] ?? 0) + calculateCategorySpent(category);
        });
        return acc;
      },
      {} as Record<CategoryType, number>,
    );

    const pieChartData = [
      {
        name: "Needs",
        value: roundToCents(spendingByGroup[CategoryType.NEEDS] ?? 0),
        color: GROUP_COLORS.NEEDS!,
      },
      {
        name: "Wants",
        value: roundToCents(spendingByGroup[CategoryType.WANTS] ?? 0),
        color: GROUP_COLORS.WANTS!,
      },
      {
        name: "Investment",
        value: roundToCents(spendingByGroup[CategoryType.INVESTMENT] ?? 0),
        color: GROUP_COLORS.INVESTMENT!,
      },
    ].filter((item) => item.value > 0);

    // Spending aggregated by category name across all active budgets.
    const categorySpending = activeBudgets.reduce(
      (acc, budget) => {
        (budget.categories ?? []).forEach((category) => {
          const spent = calculateCategorySpent(category);
          if (spent > 0) {
            const existing = acc.find((item) => item.name === category.name);
            if (existing) {
              existing.value += spent;
            } else {
              acc.push({
                name: category.name,
                value: roundToCents(spent),
                group: category.group,
              });
            }
          }
        });
        return acc;
      },
      [] as Array<{ name: string; value: number; group: CategoryType }>,
    );

    const topCategoriesData = categorySpending
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({
        name:
          item.name.length > 15
            ? item.name.substring(0, 15) + "..."
            : item.name,
        value: item.value,
        fullName: item.name,
      }));

    const allTransactions = flattenBudgetTransactions(activeBudgets);
    const recentSpending = calculateRecentSpending(allTransactions, 7);
    const dailySpendingData = calculateDailySpending(allTransactions, 7);

    return {
      totalBudgets,
      activeBudgetsCount: activeBudgets.length,
      totalIncome,
      totalSpent,
      totalRemaining,
      overallSpendingPercentage,
      spendingByGroup,
      recentSpending,
      averageDailySpending: recentSpending / 7,
      pieChartData,
      topCategoriesData,
      dailySpendingData,
    };
  }, [activeBudgets, completedBudgets, archivedBudgets]);

/**
 * Statistics for a single budget, used on the budget detail page.
 */
export const useBudgetDetailStats = (
  budget: BudgetWithRelations | undefined,
) => {
  const totalIncome = useMemo(
    () => (budget ? calculateTotalIncome(budget) : 0),
    [budget],
  );

  const totalSpent = useMemo(
    () => (budget ? calculateBudgetSpent(budget) : 0),
    [budget],
  );

  const categorySpendingData = useMemo(() => {
    if (!budget) return [];
    return (budget.categories ?? [])
      .map((category) => ({
        name: category.name,
        value: roundToCents(calculateCategorySpent(category)),
        group: category.group,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item, index) => ({
        ...item,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));
  }, [budget]);

  const dailySpendingData = useMemo(() => {
    if (!budget) return [];
    return calculateDailySpending(flattenBudgetTransactions([budget]), 7);
  }, [budget]);

  const categoryUsageData = useMemo(() => {
    if (!budget) return [];
    return (budget.categories ?? [])
      .map((category) => {
        const spent = calculateCategorySpent(category);
        const allocated = category.allocatedAmount ?? 0;
        return {
          name:
            category.name.length > 12
              ? category.name.substring(0, 12) + "..."
              : category.name,
          fullName: category.name,
          allocated: roundToCents(allocated),
          remaining: roundToCents(Math.max(0, allocated - spent)),
          spent: roundToCents(spent),
        };
      })
      .filter((item) => item.allocated > 0)
      .sort((a, b) => b.allocated - a.allocated)
      .slice(0, 5);
  }, [budget]);

  const totalRemaining = totalIncome - totalSpent;
  const spendingPercentage = calculateSpendingPercentage(
    totalSpent,
    totalIncome,
  );

  return {
    totalIncome,
    totalSpent,
    totalRemaining,
    spendingPercentage,
    categorySpendingData,
    dailySpendingData,
    categoryUsageData,
  };
};
