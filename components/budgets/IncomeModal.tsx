"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";
import { PeriodType } from "@prisma/client";
import { toast } from "react-hot-toast";
import Button from "@/components/Button";

interface Income {
  id: string;
  amount: number;
  source: string | null;
  description: string | null;
  isPlanned: boolean;
  frequency: PeriodType;
}

interface IncomeModalProps {
  isOpen: boolean;
  budgetId: string;
  incomes: Income[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function IncomeModal({
  isOpen,
  budgetId,
  incomes,
  onClose,
  onSuccess,
}: IncomeModalProps) {
  const [incomeEntries, setIncomeEntries] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIncomeEntries([...incomes]);
      setError(null);
    }
  }, [isOpen, incomes]);

  const addIncomeEntry = () => {
    const newEntry: Income = {
      id: `temp-${Date.now()}`,
      amount: 0,
      source: "",
      description: "",
      isPlanned: false,
      frequency: PeriodType.MONTHLY,
    };
    setIncomeEntries([...incomeEntries, newEntry]);
  };

  const removeIncomeEntry = (id: string) => {
    setIncomeEntries(incomeEntries.filter((entry) => entry.id !== id));
  };

  const updateIncomeEntry = (
    id: string,
    field: keyof Income,
    value: string | number | boolean,
  ) => {
    setIncomeEntries(
      incomeEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate that we have at least one income entry
      if (incomeEntries.length === 0) {
        setError("At least one income source is required");
        return;
      }

      // Validate each income entry
      for (const entry of incomeEntries) {
        if (!entry.source?.trim()) {
          setError("All income sources must have a name");
          return;
        }
        if (entry.amount <= 0) {
          setError("All income amounts must be greater than 0");
          return;
        }
      }

      // Prepare income entries for API, converting null values to empty strings
      const preparedIncomes = incomeEntries.map((entry) => ({
        ...entry,
        source: entry.source ?? "",
        description: entry.description ?? "",
      }));

      const response = await fetch(`/api/budgets/${budgetId}/income`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incomes: preparedIncomes,
        }),
      });

      const responseData = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          responseData.message ??
            responseData.error ??
            "Failed to update income",
        );
      }

      toast.success("Income sources updated successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(`Failed to update income sources: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Manage Income Sources
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Income Entries */}
            <div className="space-y-4">
              {incomeEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      Income Source {index + 1}
                    </h3>
                    <button
                      onClick={() => removeIncomeEntry(entry.id)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      disabled={incomeEntries.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Amount */}
                    <div className="col-span-1">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.amount || ""}
                          onChange={(e) =>
                            updateIncomeEntry(
                              entry.id,
                              "amount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Frequency */}
                    <div className="col-span-1">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Frequency <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={entry.frequency}
                        onChange={(e) =>
                          updateIncomeEntry(
                            entry.id,
                            "frequency",
                            e.target.value as PeriodType,
                          )
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={PeriodType.WEEKLY}>Weekly</option>
                        <option value={PeriodType.MONTHLY}>Monthly</option>
                        <option value={PeriodType.QUARTERLY}>Quarterly</option>
                        <option value={PeriodType.YEARLY}>Yearly</option>
                        <option value={PeriodType.ONE_TIME}>One Time</option>
                      </select>
                    </div>

                    {/* Source */}
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Source Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={entry.source ?? ""}
                        onChange={(e) =>
                          updateIncomeEntry(entry.id, "source", e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., Salary, Freelance, Business"
                      />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Description (Optional)
                      </label>
                      <textarea
                        value={entry.description ?? ""}
                        onChange={(e) =>
                          updateIncomeEntry(
                            entry.id,
                            "description",
                            e.target.value,
                          )
                        }
                        rows={2}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Additional details about this income..."
                      />
                    </div>

                    {/* Planned Checkbox */}
                    <div className="col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={entry.isPlanned}
                          onChange={(e) =>
                            updateIncomeEntry(
                              entry.id,
                              "isPlanned",
                              e.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Recurring income
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Income Button */}
            <Button onClick={addIncomeEntry} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Income Source
            </Button>

            {/* Total Income Display */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Total Income:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  ${totalIncome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
              <Button onClick={onClose} disabled={isLoading} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || incomeEntries.length === 0}
                variant="primary"
                isLoading={isLoading}
              >
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
