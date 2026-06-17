"use client";

import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { StrategyType, PeriodType } from "@prisma/client";
import type { CreateBudgetFormData } from "./types";
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
  errors,
  onPeriodChange,
  onStartDateChange,
}: BasicBudgetStepProps) {
  const watchedPeriod = watch("period");
  const isEndDateLocked = watchedPeriod !== PeriodType.ONE_TIME;

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
            <option value={StrategyType.FIFTY_THIRTY_TWENTY}>50/30/20</option>
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
            {isEndDateLocked && (
              <span className="ml-1 text-xs text-gray-500">
                (set by period)
              </span>
            )}
          </label>
          <input
            type="date"
            {...register("endAt")}
            readOnly={isEndDateLocked}
            aria-readonly={isEndDateLocked}
            className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary ${
              isEndDateLocked
                ? "cursor-not-allowed bg-gray-50 text-gray-600"
                : ""
            }`}
          />
          {isEndDateLocked && (
            <p className="mt-1 text-xs text-gray-500">
              Set automatically from the period and start date, so the dates
              always match the period you chose.
            </p>
          )}
          {errors.endAt && (
            <p className="mt-1 text-sm text-red-600">{errors.endAt.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
