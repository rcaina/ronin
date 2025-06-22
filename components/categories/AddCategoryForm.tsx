import { CategoryType } from "@prisma/client";
import { X, Check } from "lucide-react";
import Button from "@/components/Button";

interface CategoryFormData {
  name: string;
  spendingLimit: string;
  group: CategoryType;
}

interface AddCategoryFormProps {
  formData: CategoryFormData;
  onFormChange: (field: keyof CategoryFormData, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function AddCategoryForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
}: AddCategoryFormProps) {
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
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
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
            value={formData.name}
            onChange={(e) => onFormChange("name", e.target.value)}
            placeholder="e.g., Groceries, Entertainment"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
        </div>

        {/* Spending Limit */}
        <div>
          <label
            htmlFor="spendingLimit"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Default Spending Limit
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-gray-500">
              $
            </span>
            <input
              type="number"
              id="spendingLimit"
              value={formData.spendingLimit}
              onChange={(e) => onFormChange("spendingLimit", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Category Group */}
        <div>
          <label
            htmlFor="categoryGroup"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Category Type
          </label>
          <select
            id="categoryGroup"
            value={formData.group}
            onChange={(e) =>
              onFormChange("group", e.target.value as CategoryType)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value={CategoryType.WANTS}>Wants</option>
            <option value={CategoryType.NEEDS}>Needs</option>
            <option value={CategoryType.INVESTMENT}>Investment</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="flex-1"
          >
            <Check className="h-4 w-4" />
            {isEditing ? "Update Template" : "Create Template"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
