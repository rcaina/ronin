import { CategoryType } from "@prisma/client";
import { X, Check } from "lucide-react";
import Button from "@/components/Button";

interface CategoryFormData {
  name: string;
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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
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
