"use client";

import { Plus, X } from "lucide-react";
import type { IncomeEntry } from "./types";
import { useState, useEffect } from "react";
import Button from "../Button";

interface IncomeStepProps {
  incomeEntries: IncomeEntry[];
  onAddIncomeEntry: () => void;
  onRemoveIncomeEntry: (id: string) => void;
  onUpdateIncomeEntry: (
    id: string,
    field: keyof IncomeEntry,
    value: string | number | boolean,
  ) => void;
}

export default function IncomeStep({
  incomeEntries,
  onAddIncomeEntry,
  onRemoveIncomeEntry,
  onUpdateIncomeEntry,
}: IncomeStepProps) {
  const [displayValues, setDisplayValues] = useState<Record<string, string>>(
    {},
  );

  // Initialize display values when entries change
  useEffect(() => {
    const newDisplayValues: Record<string, string> = {};
    incomeEntries.forEach((entry) => {
      if (!(entry.id in displayValues)) {
        newDisplayValues[entry.id] =
          entry.amount === 0 ? "" : entry.amount.toString();
      }
    });
    if (Object.keys(newDisplayValues).length > 0) {
      setDisplayValues((prev) => ({ ...prev, ...newDisplayValues }));
    }
  }, [incomeEntries, displayValues]);

  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  const handleAmountChange = (entryId: string, value: string) => {
    // Allow empty, numbers, decimals, and leading zeros
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setDisplayValues((prev) => ({ ...prev, [entryId]: value }));

      // Update the actual amount value for calculations
      const numValue = value === "" ? 0 : parseFloat(value);
      onUpdateIncomeEntry(entryId, "amount", isNaN(numValue) ? 0 : numValue);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {totalIncome > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-blue-700">
                    Total Income:
                  </span>
                  <span className="font-semibold text-blue-900">
                    ${totalIncome.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          <Button
            onClick={onAddIncomeEntry}
            variant="outline"
            type="button"
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span>Income Source</span>
          </Button>
        </div>

        {incomeEntries.map((entry, index) => (
          <div key={entry.id} className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Income Source {index + 1}
              </h3>
              {incomeEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveIncomeEntry(entry.id)}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Income Amount
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayValues[entry.id] ?? ""}
                    onChange={(e) =>
                      handleAmountChange(entry.id, e.target.value)
                    }
                    className="block w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Income Source
                </label>
                <input
                  type="text"
                  value={entry.source}
                  onChange={(e) =>
                    onUpdateIncomeEntry(entry.id, "source", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                  placeholder="e.g., Salary, Freelance"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                value={entry.description}
                onChange={(e) =>
                  onUpdateIncomeEntry(entry.id, "description", e.target.value)
                }
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                placeholder="Additional details about this income..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
