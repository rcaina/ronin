"use client";

import { Plus, X } from "lucide-react";
import { PeriodType } from "@prisma/client";
import type { IncomeEntry } from "./types";

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
  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <button
          type="button"
          onClick={onAddIncomeEntry}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-700"
        >
          <div className="flex items-center justify-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Another Income Source</span>
          </div>
        </button>

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
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.amount}
                    onChange={(e) =>
                      onUpdateIncomeEntry(
                        entry.id,
                        "amount",
                        parseFloat(e.target.value) || 0,
                      )
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

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Income Frequency
                </label>
                <select
                  value={entry.frequency}
                  onChange={(e) =>
                    onUpdateIncomeEntry(
                      entry.id,
                      "frequency",
                      e.target.value as PeriodType,
                    )
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                >
                  <option value={PeriodType.WEEKLY}>Weekly</option>
                  <option value={PeriodType.MONTHLY}>Monthly</option>
                  <option value={PeriodType.QUARTERLY}>Quarterly</option>
                  <option value={PeriodType.YEARLY}>Yearly</option>
                  <option value={PeriodType.ONE_TIME}>One Time</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={entry.isPlanned}
                  onChange={(e) =>
                    onUpdateIncomeEntry(entry.id, "isPlanned", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                />
                <label className="text-sm font-medium text-gray-700">
                  This is planned income
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalIncome > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-700">Total Income:</span>
            <span className="font-semibold text-blue-900">
              ${totalIncome.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
