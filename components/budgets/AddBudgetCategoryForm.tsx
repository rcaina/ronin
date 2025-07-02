"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check } from "lucide-react";
import Button from "@/components/Button";

// Validation schema
const budgetCategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  allocatedAmount: z.number().positive("Allocated amount must be positive"),
});

type BudgetCategoryFormData = z.infer<typeof budgetCategorySchema>;

interface AddBudgetCategoryFormProps {
  onSubmit: (data: BudgetCategoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AddBudgetCategoryForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: AddBudgetCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetCategoryFormData>({
    resolver: zodResolver(budgetCategorySchema),
    defaultValues: {
      categoryName: "",
      allocatedAmount: 0,
    },
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Add Category</span>
        <button
          onClick={onCancel}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(onSubmit)();
          }
        }}
      >
        {/* Category Name */}
        <div>
          <label
            htmlFor="categoryName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Category Name
          </label>
          <input
            type="text"
            id="categoryName"
            {...register("categoryName")}
            placeholder="e.g., Groceries, Entertainment"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.categoryName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isLoading}
          />
          {errors.categoryName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.categoryName.message}
            </p>
          )}
        </div>

        {/* Allocated Amount */}
        <div>
          <label
            htmlFor="allocatedAmount"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Allocated Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              id="allocatedAmount"
              step="0.01"
              min="0"
              {...register("allocatedAmount", { valueAsNumber: true })}
              placeholder="0.00"
              className={`w-full rounded-md border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 ${
                errors.allocatedAmount
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.allocatedAmount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.allocatedAmount.message}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="flex-1"
          >
            <Check className="h-4 w-4" />
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}
