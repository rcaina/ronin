"use client";

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
  receivedAt: Date | null;
}

interface InlineIncomeEditProps {
  income: Income;
  budgetId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function InlineIncomeEdit({
  income,
  budgetId,
  onCancel,
  onSuccess,
}: InlineIncomeEditProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: income.source ?? "",
      description: income.description ?? "",
      amount: income.amount.toString(),
      frequency: income.frequency,
      isPlanned: income.isPlanned,
    },
  });

  const onSubmit = async (data: IncomeFormData) => {
    try {
      const incomeData = {
        source: data.source,
        description: data.description ?? null,
        amount: parseFloat(data.amount),
        frequency: data.frequency,
        isPlanned: data.isPlanned,
      };

      const response = await fetch(
        `/api/budgets/${budgetId}/income/${income.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(incomeData),
        },
      );

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

      toast.success("Income updated successfully!");
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      console.error("Failed to update income:", err);
      toast.error(`Failed to update income: ${errorMessage}`);
    }
  };

  return (
    <div className="group rounded-lg border border-blue-200 bg-blue-50 p-4 transition-shadow sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* First row: Source and Amount */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1">
                <div className="text-xs text-gray-500">Source</div>
                <input
                  type="text"
                  {...register("source")}
                  placeholder="Income source name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.source && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.source.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <div>
                  <div className="text-xs text-gray-500">Amount</div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      {...register("amount")}
                      placeholder="0.00"
                      step="0.01"
                      className={`w-24 rounded-md border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 ${
                        errors.amount
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    {...register("isPlanned")}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Planned</span>
                </label>
              </div>
            </div>

            {/* Second row: Frequency and Description */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1">
                <div className="text-xs text-gray-500">Frequency</div>
                <select
                  {...register("frequency")}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.frequency
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                >
                  <option value={PeriodType.WEEKLY}>Weekly</option>
                  <option value={PeriodType.MONTHLY}>Monthly</option>
                  <option value={PeriodType.QUARTERLY}>Quarterly</option>
                  <option value={PeriodType.YEARLY}>Yearly</option>
                  <option value={PeriodType.ONE_TIME}>One Time</option>
                </select>
                {errors.frequency && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.frequency.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <div className="text-xs text-gray-500">Description</div>
                <textarea
                  {...register("description")}
                  placeholder="Description (optional)"
                  rows={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2">
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                size="sm"
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                <Check className="mr-1 h-3 w-3" />
                Save
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
