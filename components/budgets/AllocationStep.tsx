"use client";

import { DollarSign, ShoppingBag, TrendingUp, Target } from "lucide-react";
import { CategoryType } from "@prisma/client";
import type { CategoryAllocation } from "./types";

interface AllocationStepProps {
  selectedCategories: CategoryAllocation[];
  totalIncome: number;
  onAllocationChange: (categoryId: string, amount: number) => void;
}

export default function AllocationStep({
  selectedCategories,
  totalIncome,
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

  const totalAllocated = selectedCategories
    .filter((cat) => cat.isSelected)
    .reduce((sum, cat) => sum + cat.allocatedAmount, 0);

  const allocationRemaining = totalIncome - totalAllocated;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {selectedCategories
          .filter((cat) => cat.isSelected)
          .map((category) => (
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
                  <div className="text-sm text-gray-500">{category.group}</div>
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
      </div>
    </div>
  );
}
