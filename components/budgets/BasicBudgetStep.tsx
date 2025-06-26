"use client";

import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { Target, TrendingUp } from "lucide-react";
import { StrategyType, PeriodType } from "@prisma/client";
import type { CreateBudgetFormData } from "./types";

// Utility functions for smart date calculation
const calculateEndDate = (startDate: Date, period: PeriodType): Date => {
  const date = new Date(startDate);

  switch (period) {
    case PeriodType.WEEKLY:
      // Find the end of the week (Sunday)
      const dayOfWeek = date.getDay();
      const daysToAdd = 6 - dayOfWeek;
      date.setDate(date.getDate() + daysToAdd);
      return date;

    case PeriodType.MONTHLY:
      // Find the last day of the current month
      const year = date.getFullYear();
      const month = date.getMonth();
      // Create a date for the first day of the next month, then subtract 1 day
      const firstDayNextMonth = new Date(year, month + 1, 1);
      const lastDay = new Date(firstDayNextMonth);
      lastDay.setDate(lastDay.getDate() - 1);
      return lastDay;

    case PeriodType.QUARTERLY:
      // Find the last day of the current quarter
      const quarter = Math.floor(date.getMonth() / 3);
      const quarterEndMonth = quarter * 3 + 2; // Last month of the quarter (0-indexed)
      // Create a date for the first day of the month after quarter end, then subtract 1 day
      const firstDayAfterQuarter = new Date(
        date.getFullYear(),
        quarterEndMonth + 1,
        1,
      );
      const quarterEndDate = new Date(firstDayAfterQuarter);
      quarterEndDate.setDate(quarterEndDate.getDate() - 1);
      return quarterEndDate;

    case PeriodType.YEARLY:
      // Find the last day of the current year
      date.setMonth(11, 31); // December 31st
      return date;

    case PeriodType.ONE_TIME:
      // For one-time, return the same date (user will manually set end date)
      return date;

    default:
      return date;
  }
};

const formatDateForInput = (date: Date): string => {
  // Handle timezone issues by using local date methods
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPeriodDescription = (startDate: Date, period: PeriodType): string => {
  const endDate = calculateEndDate(startDate, period);

  switch (period) {
    case PeriodType.WEEKLY:
      return `Week of ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    case PeriodType.MONTHLY:
      return `${startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    case PeriodType.QUARTERLY:
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${startDate.getFullYear()} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
    case PeriodType.YEARLY:
      return `${startDate.getFullYear()} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
    case PeriodType.ONE_TIME:
      return `Custom period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    default:
      return "";
  }
};

const getNextPeriodDescription = (
  startDate: Date,
  period: PeriodType,
): string => {
  const endDate = calculateEndDate(startDate, period);
  const nextStartDate = new Date(endDate);
  nextStartDate.setDate(nextStartDate.getDate() + 1);
  const nextEndDate = calculateEndDate(nextStartDate, period);

  switch (period) {
    case PeriodType.WEEKLY:
      return `Next: Week of ${nextStartDate.toLocaleDateString()} to ${nextEndDate.toLocaleDateString()}`;
    case PeriodType.MONTHLY:
      return `Next: ${nextStartDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    case PeriodType.QUARTERLY:
      const quarter = Math.floor(nextStartDate.getMonth() / 3) + 1;
      return `Next: Q${quarter} ${nextStartDate.getFullYear()}`;
    case PeriodType.YEARLY:
      return `Next: ${nextStartDate.getFullYear()}`;
    default:
      return "";
  }
};

interface BasicBudgetStepProps {
  register: UseFormRegister<CreateBudgetFormData>;
  watch: UseFormWatch<CreateBudgetFormData>;
  setValue: UseFormSetValue<CreateBudgetFormData>;
  errors: FieldErrors<CreateBudgetFormData>;
  onPeriodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function BasicBudgetStep({
  register,
  watch,
  setValue,
  errors,
  onPeriodChange,
  onStartDateChange,
}: BasicBudgetStepProps) {
  const watchedName = watch("name");
  const watchedStartAt = watch("startAt");
  const watchedEndAt = watch("endAt");
  const watchedPeriod = watch("period");
  const watchedIsRecurring = watch("isRecurring");

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Budget Name
        </label>
        <input
          type="text"
          {...register("name")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
          placeholder="e.g., Monthly Budget 2024"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Budget Strategy
          </label>
          <select
            {...register("strategy")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
          >
            <option value={StrategyType.ZERO_SUM}>Zero Sum Budget</option>
            <option value={StrategyType.PERCENTAGE}>Percentage Based</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Budget Period
          </label>
          <select
            {...register("period")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
            onChange={onPeriodChange}
          >
            <option value={PeriodType.WEEKLY}>Weekly</option>
            <option value={PeriodType.MONTHLY}>Monthly</option>
            <option value={PeriodType.QUARTERLY}>Quarterly</option>
            <option value={PeriodType.YEARLY}>Yearly</option>
            <option value={PeriodType.ONE_TIME}>One Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            {...register("startAt")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
            onChange={onStartDateChange}
          />
          {errors.startAt && (
            <p className="mt-1 text-sm text-red-600">
              {errors.startAt.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            End Date
            {watchedPeriod !== PeriodType.ONE_TIME && (
              <span className="ml-1 text-xs text-gray-500">
                (auto-calculated)
              </span>
            )}
          </label>
          <input
            type="date"
            {...register("endAt")}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary ${
              watchedPeriod !== PeriodType.ONE_TIME
                ? "border-gray-300 bg-gray-50 text-gray-600"
                : "border-gray-300"
            }`}
            disabled={watchedPeriod !== PeriodType.ONE_TIME}
          />
          {watchedPeriod !== PeriodType.ONE_TIME && (
            <p className="mt-1 text-xs text-gray-500">
              End date is automatically set to the end of the selected period
            </p>
          )}
          {errors.endAt && (
            <p className="mt-1 text-sm text-red-600">{errors.endAt.message}</p>
          )}
        </div>
      </div>
      {/* Recurring Option */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            {...register("isRecurring")}
            disabled={watchedPeriod === PeriodType.ONE_TIME}
            className={`h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary ${
              watchedPeriod === PeriodType.ONE_TIME
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
          />
          <div>
            <label
              className={`text-sm font-medium ${
                watchedPeriod === PeriodType.ONE_TIME
                  ? "text-gray-400"
                  : "text-gray-700"
              }`}
            >
              Recurring Budget
            </label>
            <p className="text-xs text-gray-500">
              {watchedPeriod === PeriodType.ONE_TIME
                ? "One-time budgets cannot be recurring"
                : watchedIsRecurring
                  ? "This budget will automatically generate the next period when the current period ends"
                  : "This is a one-time budget that won't automatically repeat"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
