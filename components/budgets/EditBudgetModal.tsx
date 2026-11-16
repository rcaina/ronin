"use client";

import { useState, useEffect } from "react";
import { X, Target, TrendingUp } from "lucide-react";
import { useUpdateBudget } from "@/lib/data-hooks/budgets/useBudgets";
import { toast } from "react-hot-toast";
import type { BudgetWithRelations } from "@/lib/types/budget";
import { StrategyType } from "@prisma/client";
import { useLockBodyScroll } from "@/lib/utils/hooks";
import Button from "../Button";
import DateInput from "../DateInput";

interface EditBudgetModalProps {
  isOpen: boolean;
  budget: BudgetWithRelations | null;
  onClose: () => void;
}

interface EditBudgetFormData {
  name: string;
  strategy: StrategyType;
  startAt: string;
  endAt: string;
}

export default function EditBudgetModal({
  isOpen,
  budget,
  onClose,
}: EditBudgetModalProps) {
  const updateBudgetMutation = useUpdateBudget();
  const [formData, setFormData] = useState<EditBudgetFormData>({
    name: "",
    strategy: StrategyType.ZERO_SUM,
    startAt: "",
    endAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The monthly budget has no dates to edit.
  const isContinuous = budget?.kind === "CONTINUOUS";

  // Initialize form data when budget changes
  useEffect(() => {
    if (budget) {
      const startDate = new Date(budget.startAt).toISOString().slice(0, 10);
      const endDate = budget.endAt
        ? new Date(budget.endAt).toISOString().slice(0, 10)
        : "";

      setFormData({
        name: budget.name,
        strategy: budget.strategy,
        startAt: startDate,
        endAt: endDate,
      });
    }
  }, [budget]);

  const handleInputChange = (
    field: keyof EditBudgetFormData,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) return;

    setIsSubmitting(true);
    try {
      await updateBudgetMutation.mutateAsync({
        id: budget.id,
        data: isContinuous
          ? { name: formData.name, strategy: formData.strategy }
          : {
              name: formData.name,
              strategy: formData.strategy,
              startAt: formData.startAt,
              endAt: formData.endAt,
            },
      });

      toast.success("Budget updated successfully!");
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
      case StrategyType.ZERO_SUM:
        return <Target className="h-4 w-4" />;
      case StrategyType.FIFTY_THIRTY_TWENTY:
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case StrategyType.ZERO_SUM:
        return "Zero-sum budget";
      case StrategyType.FIFTY_THIRTY_TWENTY:
        return "50/30/20";
      default:
        return strategy;
    }
  };

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md animate-scale-in overflow-y-auto overscroll-contain rounded-2xl bg-surface-card p-6 shadow-lifted">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Budget</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="tap-target rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
              Budget name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
                    className="mr-3 h-4 w-4 text-secondary-600 focus:ring-secondary"
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

          {!isContinuous && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startAt"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start date
                </label>
                <div className="relative mt-1">
                  <DateInput
                    id="startAt"
                    value={formData.startAt}
                    onChange={(e) =>
                      handleInputChange("startAt", e.target.value)
                    }
                    className="cursor-pointer"
                    required
                    min="1900-01-01"
                    max="2100-12-31"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="endAt"
                  className="block text-sm font-medium text-gray-700"
                >
                  End date
                </label>
                <div className="relative mt-1">
                  <DateInput
                    id="endAt"
                    value={formData.endAt}
                    onChange={(e) => handleInputChange("endAt", e.target.value)}
                    className="cursor-pointer"
                    required
                    min="1900-01-01"
                    max="2100-12-31"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-black/90 shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50"
            >
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
