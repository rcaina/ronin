"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { PeriodType } from "@prisma/client";
import Button from "../Button";

// Validation schema
const incomeSchema = z.object({
  source: z.string().min(1, "Source name is required"),
  description: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount is required and must be greater than 0"),
  frequency: z.nativeEnum(PeriodType),
  isPlanned: z.boolean(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface Income {
  id: string;
  amount: number;
  source: string | null;
  description: string | null;
  isPlanned: boolean;
  frequency: PeriodType;
}

interface IncomeFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  income?: Income; // For editing
  budgetId: string;
}

export default function IncomeForm({
  onClose,
  onSuccess,
  income,
  budgetId,
}: IncomeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!income;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: income?.source ?? "",
      description: income?.description ?? "",
      amount: income?.amount?.toString() ?? "",
      frequency: income?.frequency ?? PeriodType.MONTHLY,
      isPlanned: income?.isPlanned ?? false,
    },
  });

  // Reset form when income changes
  useEffect(() => {
    if (income) {
      reset({
        source: income.source ?? "",
        description: income.description ?? "",
        amount: income.amount?.toString() ?? "",
        frequency: income.frequency,
        isPlanned: income.isPlanned,
      });
    } else {
      reset({
        source: "",
        description: "",
        amount: "",
        frequency: PeriodType.MONTHLY,
        isPlanned: false,
      });
    }
  }, [income, reset]);

  const onSubmit = async (data: IncomeFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const incomeData = {
        source: data.source,
        description: data.description ?? null,
        amount: parseFloat(data.amount),
        frequency: data.frequency,
        isPlanned: data.isPlanned,
      };

      const url = isEditing
        ? `/api/budgets/${budgetId}/income/${income.id}`
        : `/api/budgets/${budgetId}/income`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(incomeData),
      });

      const responseData = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          responseData.message ??
            responseData.error ??
            `Failed to ${isEditing ? "update" : "create"} income`,
        );
      }

      toast.success(
        `Income ${isEditing ? "updated" : "created"} successfully!`,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(
        `Failed to ${isEditing ? "update" : "create"} income: ${errorMessage}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Income Source" : "Add Income Source"}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {/* Source Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="source"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Source Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="source"
              {...register("source")}
              placeholder="e.g., Salary, Freelance, Business"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            {errors.source && (
              <p className="mt-1 text-sm text-red-600">
                {errors.source.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-500">
                $
              </span>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                {...register("amount")}
                placeholder="0.00"
                className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label
              htmlFor="frequency"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              id="frequency"
              {...register("frequency")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value={PeriodType.WEEKLY}>Weekly</option>
              <option value={PeriodType.MONTHLY}>Monthly</option>
              <option value={PeriodType.QUARTERLY}>Quarterly</option>
              <option value={PeriodType.YEARLY}>Yearly</option>
              <option value={PeriodType.ONE_TIME}>One Time</option>
            </select>
            {errors.frequency && (
              <p className="mt-1 text-sm text-red-600">
                {errors.frequency.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder="Additional details about this income..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Planned Checkbox */}
          <div className="sm:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register("isPlanned")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Recurring income
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <Button onClick={onClose} disabled={isLoading} variant="outline">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            variant="primary"
            isLoading={isLoading}
          >
            <Check className="mr-2 h-4 w-4" />
            {isEditing ? "Update Income" : "Add Income"}
          </Button>
        </div>
      </form>
    </div>
  );
}
