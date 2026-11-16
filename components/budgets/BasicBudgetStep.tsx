"use client";

import type {
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { StrategyType } from "@prisma/client";
import type { CreateBudgetFormData } from "./types";
import DateInput from "../DateInput";
interface BasicBudgetStepProps {
  register: UseFormRegister<CreateBudgetFormData>;
  setValue: UseFormSetValue<CreateBudgetFormData>;
  errors: FieldErrors<CreateBudgetFormData>;
}

export default function BasicBudgetStep({
  register,
  errors,
}: BasicBudgetStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Event name
        </label>
        <input
          type="text"
          {...register("name")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
          placeholder="e.g., Summer trip"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Budget strategy
        </label>
        <select
          {...register("strategy")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
        >
          <option value={StrategyType.ZERO_SUM}>Zero-sum budget</option>
          <option value={StrategyType.FIFTY_THIRTY_TWENTY}>50/30/20</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start date
          </label>
          <DateInput {...register("startAt")} className="mt-1 shadow-sm" />
          {errors.startAt && (
            <p className="mt-1 text-sm text-red-600">
              {errors.startAt.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            End date
          </label>
          <DateInput {...register("endAt")} className="mt-1 shadow-sm" />
          {errors.endAt && (
            <p className="mt-1 text-sm text-red-600">{errors.endAt.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
