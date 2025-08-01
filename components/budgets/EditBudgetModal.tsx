"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Target, TrendingUp } from "lucide-react";
import { useUpdateBudget } from "@/lib/data-hooks/budgets/useBudgets";
import { toast } from "react-hot-toast";
import type { BudgetWithRelations } from "@/lib/types/budget";
import type { StrategyType, PeriodType } from "@prisma/client";
import Button from "../Button";

interface EditBudgetModalProps {
  isOpen: boolean;
  budget: BudgetWithRelations | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditBudgetFormData {
  name: string;
  strategy: StrategyType;
  period: PeriodType;
  startAt: string;
  endAt: string;
}

export default function EditBudgetModal({
  isOpen,
  budget,
  onClose,
  onSuccess,
}: EditBudgetModalProps) {
  const updateBudgetMutation = useUpdateBudget();
  const [formData, setFormData] = useState<EditBudgetFormData>({
    name: "",
    strategy: "ZERO_SUM",
    period: "MONTHLY",
    startAt: "",
    endAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when budget changes
  useEffect(() => {
    if (budget && budget.startAt && budget.endAt) {
      setFormData({
        name: budget.name,
        strategy: budget.strategy,
        period: budget.period,
        startAt: new Date(budget.startAt).toISOString().split("T")[0] ?? "",
        endAt: new Date(budget.endAt).toISOString().split("T")[0] ?? "",
      });
    }
  }, [budget]);

  const handleInputChange = (
    field: keyof EditBudgetFormData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) return;

    setIsSubmitting(true);
    try {
      await updateBudgetMutation.mutateAsync({
        id: budget.id,
        data: {
          name: formData.name,
          strategy: formData.strategy,
          period: formData.period,
          startAt: formData.startAt,
          endAt: formData.endAt,
        },
      });

      toast.success("Budget updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update budget:", error);
      toast.error("Failed to update budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case "ZERO_SUM":
        return <Target className="h-4 w-4" />;
      case "FIFTY_THIRTY_TWENTY":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case "ZERO_SUM":
        return "Zero Sum Budget";
      case "FIFTY_THIRTY_TWENTY":
        return "50/30/20";
      default:
        return strategy;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "WEEKLY":
        return "Weekly";
      case "MONTHLY":
        return "Monthly";
      case "QUARTERLY":
        return "Quarterly";
      case "YEARLY":
        return "Yearly";
      default:
        return period;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Budget</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Budget Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Budget Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter budget name"
              required
            />
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Strategy
            </label>
            <div className="mt-1 grid grid-cols-1 gap-2">
              {["ZERO_SUM", "FIFTY_THIRTY_TWENTY"].map((strategy) => (
                <label
                  key={strategy}
                  className="flex cursor-pointer items-center rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy}
                    checked={formData.strategy === strategy}
                    onChange={(e) =>
                      handleInputChange("strategy", e.target.value)
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    {getStrategyIcon(strategy)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {getStrategyLabel(strategy)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Period
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].map((period) => (
                <label
                  key={period}
                  className="flex cursor-pointer items-center rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="period"
                    value={period}
                    checked={formData.period === period}
                    onChange={(e) =>
                      handleInputChange("period", e.target.value)
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {getPeriodLabel(period)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startAt"
                className="block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>
              <div className="relative mt-1">
                <input
                  type="date"
                  id="startAt"
                  value={formData.startAt}
                  onChange={(e) => handleInputChange("startAt", e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label
                htmlFor="endAt"
                className="block text-sm font-medium text-gray-700"
              >
                End Date
              </label>
              <div className="relative mt-1">
                <input
                  type="date"
                  id="endAt"
                  value={formData.endAt}
                  onChange={(e) => handleInputChange("endAt", e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="hover:bg-accent rounded-md bg-secondary px-4 py-2 text-sm font-medium text-black/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
