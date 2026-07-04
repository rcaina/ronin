"use client";

import { useEffect, useState } from "react";
import { CategoryType } from "@prisma/client";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

export type BudgetCategoryStatusFilter =
  | "all"
  | "inProgress"
  | "completed"
  | "overBudget";

export type BudgetCategoryGroupFilter = "all" | CategoryType;

export type BudgetCategorySortOption =
  | "name"
  | "percentSpent"
  | "remaining"
  | "allocated";

export interface BudgetCategoryFilters {
  status: BudgetCategoryStatusFilter;
  group: BudgetCategoryGroupFilter;
  sort: BudgetCategorySortOption;
  unusedOnly: boolean;
}

export const DEFAULT_BUDGET_CATEGORY_FILTERS: BudgetCategoryFilters = {
  status: "all",
  group: "all",
  sort: "name",
  unusedOnly: false,
};

interface BudgetCategoryFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: BudgetCategoryFilters;
  onApply: (filters: BudgetCategoryFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: Array<{
  value: BudgetCategoryStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "inProgress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "overBudget", label: "Over budget" },
];

const GROUP_OPTIONS: Array<{
  value: BudgetCategoryGroupFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: CategoryType.NEEDS, label: "Needs" },
  { value: CategoryType.WANTS, label: "Wants" },
  { value: CategoryType.INVESTMENT, label: "Investment" },
];

const SORT_OPTIONS: Array<{ value: BudgetCategorySortOption; label: string }> =
  [
    { value: "name", label: "Name" },
    { value: "percentSpent", label: "Percent spent" },
    { value: "remaining", label: "Remaining" },
    { value: "allocated", label: "Allocated amount" },
  ];

function FilterChip({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "bg-secondary text-primary-950"
          : "bg-surface-muted text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function BudgetCategoryFiltersModal({
  isOpen,
  onClose,
  filters,
  onApply,
  onClear,
}: BudgetCategoryFiltersModalProps) {
  const [draft, setDraft] = useState<BudgetCategoryFilters>(filters);

  // Reseed draft state from the current filters every time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft(DEFAULT_BUDGET_CATEGORY_FILTERS);
    onClear();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      title="Filter categories"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                isActive={draft.status === option.value}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, status: option.value }))
                }
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Group */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">
            Category group
          </p>
          <div className="flex flex-wrap gap-2">
            {GROUP_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                isActive={draft.group === option.value}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, group: option.value }))
                }
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Sort by</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                isActive={draft.sort === option.value}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, sort: option.value }))
                }
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Unused toggle */}
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-surface-card px-3.5 py-2.5">
          <span className="text-sm font-medium text-gray-700">
            Unused (no transactions)
          </span>
          <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
            <input
              type="checkbox"
              checked={draft.unusedOnly}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  unusedOnly: e.target.checked,
                }))
              }
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-200 transition-colors duration-200 peer-checked:bg-secondary" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-200 peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </Modal>
  );
}
