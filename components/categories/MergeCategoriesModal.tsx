"use client";

import { AlertTriangle } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import type { CategorySummary } from "@/lib/types/category";
import type {
  GroupColorFunction,
  GroupLabelFunction,
} from "@/lib/types/budget";

interface MergeCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The categories the user selected for the merge. */
  categories: CategorySummary[];
  /** ID of the category the user has chosen to keep, or null until they pick one. */
  targetId: string | null;
  onSelectTarget: (id: string) => void;
  onConfirm: (targetId: string) => void;
  isLoading?: boolean;
  getGroupColor: GroupColorFunction;
  getGroupLabel: GroupLabelFunction;
}

export default function MergeCategoriesModal({
  isOpen,
  onClose,
  categories,
  targetId,
  onSelectTarget,
  onConfirm,
  isLoading = false,
  getGroupColor,
  getGroupLabel,
}: MergeCategoriesModalProps) {
  const spansMultipleGroups =
    new Set(categories.map((category) => category.group)).size > 1;

  const handleConfirm = () => {
    if (!targetId) return;
    onConfirm(targetId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge categories"
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isLoading || !targetId}
            isLoading={isLoading}
            className="flex-1"
          >
            {isLoading ? "Merging..." : `Merge ${categories.length} categories`}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-sm text-gray-500">
          Choose which category to keep. The rest will be merged into it, budget
          categories linked to them will be relinked, and this can&apos;t be
          undone.
          {spansMultipleGroups &&
            " These categories span different groups — the one you keep stays in its own group."}
        </p>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <label
            key={category.id}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all duration-200 ease-out ${
              targetId === category.id
                ? "border-secondary bg-secondary/10"
                : "border-gray-200/70 hover:border-gray-300 hover:bg-surface-muted"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="merge-target"
                value={category.id}
                checked={targetId === category.id}
                onChange={() => onSelectTarget(category.id)}
                className="h-4 w-4 text-secondary-600 focus:ring-secondary"
              />
              <span className="text-sm font-medium text-gray-900">
                {category.name}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {targetId === category.id && (
                <span className="shrink-0 rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary-700">
                  Survivor
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-gray-600">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${getGroupColor(category.group)}`}
                />
                {getGroupLabel(category.group)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
