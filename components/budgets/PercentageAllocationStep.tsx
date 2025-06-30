"use client";

import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { CategoryType, type PeriodType } from "@prisma/client";
import type { CategoryAllocation } from "./types";
import { calculateAdjustedIncome } from "@/lib/utils";

interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: PeriodType;
}

interface PercentageAllocationStepProps {
  selectedCategories: CategoryAllocation[];
  incomeEntries: IncomeEntry[];
  budgetPeriod: PeriodType;
  onAllocationChange: (categoryId: string, amount: number) => void;
}

// 50/30/20 rule percentages
const PERCENTAGE_RULE = {
  [CategoryType.NEEDS]: 0.5, // 50%
  [CategoryType.WANTS]: 0.3, // 30%
  [CategoryType.INVESTMENT]: 0.2, // 20%
};

export default function PercentageAllocationStep({
  selectedCategories,
  incomeEntries,
  budgetPeriod,
  onAllocationChange,
}: PercentageAllocationStepProps) {
  // Calculate total adjusted income based on frequency and budget period
  const totalIncome = incomeEntries.reduce((sum, entry) => {
    const adjustedAmount = calculateAdjustedIncome(
      entry.amount,
      entry.frequency,
      budgetPeriod,
    );
    return sum + adjustedAmount;
  }, 0);

  // Group categories by type
  const categoriesByGroup = selectedCategories
    .filter((cat) => cat.isSelected)
    .reduce(
      (acc, category) => {
        if (!acc[category.group]) {
          acc[category.group] = [];
        }
        acc[category.group].push(category);
        return acc;
      },
      {} as Record<CategoryType, CategoryAllocation[]>,
    );

  const getCategoryGroupIcon = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return <DollarSign className="h-4 w-4" />;
      case CategoryType.WANTS:
        return <ShoppingBag className="h-4 w-4" />;
      case CategoryType.INVESTMENT:
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getGroupLabel = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "Needs (50%)";
      case CategoryType.WANTS:
        return "Wants (30%)";
      case CategoryType.INVESTMENT:
        return "Investments (20%)";
      default:
        return group;
    }
  };

  // Calculate total allocated amount
  const totalAllocated = selectedCategories
    .filter((cat) => cat.isSelected)
    .reduce((sum, cat) => sum + cat.allocatedAmount, 0);

  const allocationRemaining = totalIncome - totalAllocated;

  return (
    <div className="space-y-6">
      {/* 50/30/20 rule info */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div>
          <h3 className="text-sm font-medium text-blue-900">
            50/30/20 Budget Rule
          </h3>
          <p className="text-sm text-blue-700">
            Recommended allocation: 50% to needs, 30% to wants, and 20% to
            investments. You can adjust amounts as needed, but consider the
            recommended percentages.
          </p>
        </div>
      </div>

      {/* Categories grouped by type */}
      <div className="space-y-6">
        {Object.entries(categoriesByGroup).map(([group, categories]) => {
          const categoryType = group as CategoryType;
          const percentage = PERCENTAGE_RULE[categoryType];
          const recommendedGroupTotal = totalIncome * percentage;
          const groupAllocated = categories.reduce(
            (sum, cat) => sum + cat.allocatedAmount,
            0,
          );
          const isOverBudget = groupAllocated > recommendedGroupTotal;

          return (
            <div key={group} className="space-y-4">
              {/* Group header */}
              <div
                className={`flex items-center justify-between rounded-lg p-4 ${
                  isOverBudget
                    ? "border border-red-200 bg-red-50"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getCategoryGroupIcon(categoryType)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {getGroupLabel(categoryType)}
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  Amount to allocate: ${recommendedGroupTotal.toLocaleString()}{" "}
                  ({(percentage * 100).toFixed(0)}%)
                </div>
              </div>

              {/* Categories in this group */}
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.categoryId}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center space-x-3">
                      {getCategoryGroupIcon(category.group)}
                      <div>
                        <div className="font-medium text-gray-900">
                          {category.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {category.group}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          category.allocatedAmount === 0
                            ? ""
                            : category.allocatedAmount
                        }
                        onChange={(e) =>
                          onAllocationChange(
                            category.categoryId,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-medium ${
                    isOverBudget ? "text-red-900" : "text-gray-900"
                  }`}
                >
                  Amount allocated: ${groupAllocated.toLocaleString()}
                </div>
                <div
                  className={`text-sm ${
                    isOverBudget ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {recommendedGroupTotal > 0
                    ? ((groupAllocated / recommendedGroupTotal) * 100).toFixed(
                        1,
                      )
                    : 0}
                  %
                </div>
                {isOverBudget && (
                  <div className="mt-1 flex items-center space-x-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Over recommended budget</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Remaining:</span>
          <span
            className={`font-semibold ${
              allocationRemaining >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            ${allocationRemaining.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Total Allocated:</span>
          <span className="font-semibold text-gray-900">
            ${totalAllocated.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Total Income ({budgetPeriod.toLowerCase()}):
          </span>
          <span className="font-semibold text-gray-900">
            ${totalIncome.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
