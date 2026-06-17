"use client";

import { useMemo, useState } from "react";
import { X, CheckCircle2, FolderInput } from "lucide-react";
import { toast } from "react-hot-toast";
import { CategoryType } from "@prisma/client";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useImportBudgetCategories } from "@/lib/data-hooks/budgets/useBudgetCategories";
import { formatCurrency, getCategoryBadgeColor } from "@/lib/utils";
import type { BudgetWithRelations } from "@/lib/types/budget";
import Button from "../Button";
import LoadingSpinner from "../LoadingSpinner";

interface ImportCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The budget the categories will be imported into. */
  budgetId: string;
}

const GROUP_ORDER: CategoryType[] = [
  CategoryType.NEEDS,
  CategoryType.WANTS,
  CategoryType.INVESTMENT,
];

const GROUP_LABELS: Record<CategoryType, string> = {
  [CategoryType.NEEDS]: "Needs",
  [CategoryType.WANTS]: "Wants",
  [CategoryType.INVESTMENT]: "Investments",
};

export default function ImportCategoriesModal({
  isOpen,
  onClose,
  budgetId,
}: ImportCategoriesModalProps) {
  const { data: budgets, isLoading } = useBudgets();
  const importMutation = useImportBudgetCategories();

  const [sourceBudgetId, setSourceBudgetId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Other budgets that actually have categories to copy.
  const sourceBudgets = useMemo(
    () =>
      (budgets ?? []).filter(
        (b) => b.id !== budgetId && (b.categories?.length ?? 0) > 0,
      ),
    [budgets, budgetId],
  );

  const sourceBudget = sourceBudgets.find((b) => b.id === sourceBudgetId);

  type SourceCategory = BudgetWithRelations["categories"][number];

  const categoriesByGroup = useMemo(() => {
    const grouped: Record<CategoryType, SourceCategory[]> = {
      [CategoryType.NEEDS]: [],
      [CategoryType.WANTS]: [],
      [CategoryType.INVESTMENT]: [],
    };
    (sourceBudget?.categories ?? []).forEach((cat) => {
      grouped[cat.group].push(cat);
    });
    return grouped;
  }, [sourceBudget]);

  const handleSelectSource = (id: string) => {
    setSourceBudgetId(id);
    const budget = sourceBudgets.find((b) => b.id === id);
    // Default to importing everything; users can deselect.
    setSelectedIds(new Set((budget?.categories ?? []).map((c) => c.id)));
  };

  const toggleCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClose = () => {
    setSourceBudgetId("");
    setSelectedIds(new Set());
    onClose();
  };

  const handleImport = async () => {
    if (!sourceBudgetId || selectedIds.size === 0) return;
    try {
      const result = await importMutation.mutateAsync({
        budgetId,
        data: { sourceBudgetId, categoryIds: Array.from(selectedIds) },
      });
      if (result.imported === 0) {
        toast.success("Those categories are already in this budget");
      } else {
        toast.success(
          `Imported ${result.imported} categor${result.imported === 1 ? "y" : "ies"}` +
            (result.skipped > 0 ? ` (${result.skipped} already existed)` : ""),
        );
      }
      handleClose();
    } catch (error) {
      console.error("Failed to import categories:", error);
      toast.error("Failed to import categories. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg animate-scale-in flex-col rounded-2xl bg-surface-card shadow-lifted">
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary-700">
              <FolderInput className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Import categories
              </h2>
              <p className="text-sm text-gray-500">
                Copy categories from another budget into this one.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner message="Loading budgets..." />
            </div>
          ) : sourceBudgets.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              No other budgets with categories to import from.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Source budget picker */}
              <div>
                <label
                  htmlFor="source-budget"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Import from
                </label>
                <select
                  id="source-budget"
                  value={sourceBudgetId}
                  onChange={(e) => handleSelectSource(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                >
                  <option value="">Select a budget...</option>
                  {sourceBudgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.categories.length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category selection */}
              {sourceBudget &&
                GROUP_ORDER.map((group) => {
                  const cats = categoriesByGroup[group] ?? [];
                  if (cats.length === 0) return null;
                  return (
                    <div key={group} className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {GROUP_LABELS[group]}
                      </h4>
                      <div className="space-y-2">
                        {cats.map((cat) => {
                          const isSelected = selectedIds.has(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                                isSelected
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 bg-surface-card hover:border-secondary hover:bg-secondary/5"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {cat.name}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getCategoryBadgeColor(
                                    cat.group,
                                  )}`}
                                >
                                  {cat.group}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm tabular-nums text-gray-500">
                                  {formatCurrency(cat.allocatedAmount ?? 0)}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t bg-gray-50 p-5">
          <span className="text-sm text-gray-500">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : "No categories selected"}
          </span>
          <div className="flex space-x-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                !sourceBudgetId ||
                selectedIds.size === 0 ||
                importMutation.isPending
              }
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
