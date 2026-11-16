import { useMemo } from "react";
import type { BudgetWithRelations } from "@/lib/types/budget";
import { roundToCents } from "@/lib/utils";
import {
  calculateAverageSpendingByWeekday,
  calculateBudgetSpent,
  calculateCategorySpent,
  calculateSpendingPercentage,
  calculateTotalIncome,
  flattenBudgetTransactions,
} from "@/lib/utils/spending";

import { CHART_COLORS } from "@/components/recharts/theme";

// Palette for the per-category pie chart on the budget detail page.
const CATEGORY_COLORS = CHART_COLORS;

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
    return calculateAverageSpendingByWeekday(
      flattenBudgetTransactions([budget]),
    );
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
