"use client";

import { DollarSign, ShoppingBag, TrendingUp, Target } from "lucide-react";
import { CategoryType, type PeriodType } from "@prisma/client";
import type { CategoryAllocation } from "./types";
import {
  calculateAdjustedIncome,
  getCategoryBadgeColor,
  sumMonetaryValues,
} from "@/lib/utils";

interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: PeriodType;
}

interface AllocationStepProps {
  selectedCategories: CategoryAllocation[];
  incomeEntries: IncomeEntry[];
  budgetPeriod: PeriodType;
  onAllocationChange: (categoryId: string, amount: number) => void;
}

export default function AllocationStep({
  selectedCategories,
  incomeEntries,
  budgetPeriod,
  onAllocationChange,
}: AllocationStepProps) {
  const getCategoryGroupIcon = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return <DollarSign className="h-4 w-4" />;
      case CategoryType.WANTS:
        return <ShoppingBag className="h-4 w-4" />;
      case CategoryType.INVESTMENT:
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  // Calculate total adjusted income based on frequency and budget period
  const totalIncome = incomeEntries.reduce((sum, entry) => {
    const adjustedAmount = calculateAdjustedIncome(
      entry.amount,
      entry.frequency,
      budgetPeriod,
    );
    return sum + adjustedAmount;
  }, 0);

  const totalAllocated = sumMonetaryValues(
    selectedCategories.map((cat) => cat.allocatedAmount),
  );

  const allocationRemaining = totalIncome - totalAllocated;

  return (
    <div className="space-y-6">
      {selectedCategories.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
            <DollarSign className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No Categories to Allocate
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            You haven&apos;t added any spending categories yet. You can add
            categories in the previous step, or create your budget without
            categories and add them later from your budget settings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedCategories.map((category) => (
            <div
              key={category.categoryId}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center space-x-3">
                {getCategoryGroupIcon(category.group)}
                <div className="font-medium text-gray-900">{category.name}</div>
                <div
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${getCategoryBadgeColor(
                    category.group,
                  )}`}
                >
                  {category.group}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={category.allocatedAmount}
                  onChange={(e) =>
                    onAllocationChange(
                      category.categoryId,
                      parseFloat(e.target.value) ?? 0,
                    )
                  }
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                />
              </div>
            </div>
          ))}
        </div>
      )}

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
