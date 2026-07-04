"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type CategoryType } from "@prisma/client";
import Button from "@/components/Button";
import DateInput from "@/components/DateInput";
import Modal from "@/components/Modal";

export type TransactionSortBy = "date" | "amount" | "name";
export type TransactionSortOrder = "asc" | "desc";

/**
 * Shared filter values for both the global transactions page and the
 * per-budget transactions page. Fields that only apply to one page are
 * optional — the modal renders a section for a field only when it is
 * present on `values` (or, for list-backed sections, when the matching
 * options prop is provided).
 */
export interface TransactionFilterValues {
  startDate: string;
  endDate: string;
  sortBy: TransactionSortBy;
  sortOrder: TransactionSortOrder;
  selectedCategory: string;
  selectedCard: string;
  /** Global transactions page only. */
  pageSize?: number;
  /** Global transactions page only. */
  selectedBudget?: string;
  /** Per-budget transactions page only. */
  selectedCategoryType?: CategoryType | "all";
}

interface CategoryOption {
  id: string;
  name: string;
}

interface BudgetOption {
  id: string;
  name: string;
}

interface CardOption {
  id: string;
  displayName: string;
}

interface TransactionFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Currently applied filter values; the modal seeds its draft from these each time it opens. */
  values: TransactionFilterValues;
  /** Values to reset the draft to (and report via onClear) when "Clear" is pressed. */
  defaultValues: TransactionFilterValues;
  onApply: (values: TransactionFilterValues) => void;
  onClear: () => void;
  categories: CategoryOption[];
  cards: CardOption[];
  /** Provide to render the Budget filter section (global transactions page). */
  budgets?: BudgetOption[];
}

const TransactionFiltersModal = ({
  isOpen,
  onClose,
  values,
  defaultValues,
  onApply,
  onClear,
  categories,
  cards,
  budgets,
}: TransactionFiltersModalProps) => {
  const [draft, setDraft] = useState<TransactionFilterValues>(values);
  const fieldId = useId();

  // Keep the latest committed values around without making them a dependency
  // of the seed effect below (they can change identity on every render).
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Seed the draft from the currently applied filters every time the modal
  // opens. Editing controls only ever updates the draft; closing without
  // saving simply discards it.
  useEffect(() => {
    if (isOpen) {
      setDraft(valuesRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showPageSize = draft.pageSize !== undefined;
  const showBudget = budgets !== undefined;
  const showCategoryType = draft.selectedCategoryType !== undefined;

  const handleClear = () => {
    setDraft(defaultValues);
    onClear();
    onClose();
  };

  const handleSave = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      title="Filters"
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`${fieldId}-start-date`}
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Start date
            </label>
            <DateInput
              id={`${fieldId}-start-date`}
              value={draft.startDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, startDate: e.target.value }))
              }
              className="rounded-xl"
            />
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-end-date`}
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              End date
            </label>
            <DateInput
              id={`${fieldId}-end-date`}
              value={draft.endDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, endDate: e.target.value }))
              }
              className="rounded-xl"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-sort`}
            className="mb-1 block text-xs font-medium text-gray-500"
          >
            Sort by
          </label>
          <select
            id={`${fieldId}-sort`}
            value={`${draft.sortBy}-${draft.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-") as [
                TransactionSortBy,
                TransactionSortOrder,
              ];
              setDraft((d) => ({ ...d, sortBy, sortOrder }));
            }}
            className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="date-desc">Date (newest)</option>
            <option value="date-asc">Date (oldest)</option>
            <option value="amount-desc">Amount (high to low)</option>
            <option value="amount-asc">Amount (low to high)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>

        {showPageSize && (
          <div>
            <label
              htmlFor={`${fieldId}-page-size`}
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Per page
            </label>
            <select
              id={`${fieldId}-page-size`}
              value={draft.pageSize}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  pageSize: parseInt(e.target.value),
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        )}

        {showCategoryType && (
          <div>
            <label
              htmlFor={`${fieldId}-category-type`}
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Category type
            </label>
            <select
              id={`${fieldId}-category-type`}
              value={draft.selectedCategoryType}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  selectedCategoryType: e.target.value as CategoryType | "all",
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="all">All types</option>
              <option value="WANTS">Wants</option>
              <option value="NEEDS">Needs</option>
              <option value="INVESTMENT">Investments</option>
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor={`${fieldId}-category`}
            className="mb-1 block text-xs font-medium text-gray-500"
          >
            Category
          </label>
          <select
            id={`${fieldId}-category`}
            value={draft.selectedCategory}
            onChange={(e) =>
              setDraft((d) => ({ ...d, selectedCategory: e.target.value }))
            }
            className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {showBudget && (
          <div>
            <label
              htmlFor={`${fieldId}-budget`}
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Budget
            </label>
            <select
              id={`${fieldId}-budget`}
              value={draft.selectedBudget}
              onChange={(e) =>
                setDraft((d) => ({ ...d, selectedBudget: e.target.value }))
              }
              className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="all">All budgets</option>
              <option value="no-budget">No budget</option>
              {budgets?.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor={`${fieldId}-card`}
            className="mb-1 block text-xs font-medium text-gray-500"
          >
            Card
          </label>
          <select
            id={`${fieldId}-card`}
            value={draft.selectedCard}
            onChange={(e) =>
              setDraft((d) => ({ ...d, selectedCard: e.target.value }))
            }
            className="w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="all">All cards</option>
            <option value="no-card">No card</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionFiltersModal;
