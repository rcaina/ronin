"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CategoryType } from "@prisma/client";
import { X, Check } from "lucide-react";
import Button from "@/components/Button";

// Validation schema
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  group: z.nativeEnum(CategoryType),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AddCategoryFormProps {
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  defaultValues?: Partial<CategoryFormData>;
}

export default function AddCategoryForm({
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
  defaultValues,
}: AddCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      group: CategoryType.WANTS,
      ...defaultValues,
    },
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          {isEditing ? "Edit Template" : "New Template"}
        </span>
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
        className="space-y-4"
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
            {...register("name")}
            placeholder="e.g., Groceries, Entertainment"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Category Group */}
        <div>
          <label
            htmlFor="categoryGroup"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Category Group
          </label>
          <select
            id="categoryGroup"
            {...register("group")}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.group
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isLoading}
          >
            <option value={CategoryType.NEEDS}>Needs</option>
            <option value={CategoryType.WANTS}>Wants</option>
            <option value={CategoryType.INVESTMENT}>Investment</option>
          </select>
          {errors.group && (
            <p className="mt-1 text-sm text-red-600">{errors.group.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="flex-1"
          >
            <Check className="h-4 w-4" />
            {isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
