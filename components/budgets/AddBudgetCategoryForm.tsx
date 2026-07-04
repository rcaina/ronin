"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/Button";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import type { CategoryType } from "@prisma/client";

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
  group: CategoryType;
  existingCategoryNames: string[];
}

type ComboboxItem =
  | { type: "suggestion"; name: string }
  | { type: "create"; name: string };

export default function AddBudgetCategoryForm({
  onSubmit,
  onCancel,
  isLoading = false,
  group,
  existingCategoryNames,
}: AddBudgetCategoryFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BudgetCategoryFormData>({
    resolver: zodResolver(budgetCategorySchema),
    defaultValues: {
      categoryName: "",
      allocatedAmount: 0,
    },
  });

  const { data: defaultCategories } = useCategories();

  const categoriesForGroup = useMemo(() => {
    if (!defaultCategories) return [];
    switch (group) {
      case "NEEDS":
        return defaultCategories.needs;
      case "WANTS":
        return defaultCategories.wants;
      case "INVESTMENT":
        return defaultCategories.investment;
      default:
        return [];
    }
  }, [defaultCategories, group]);

  const existingNamesLower = useMemo(
    () => existingCategoryNames.map((name) => name.toLowerCase()),
    [existingCategoryNames],
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const comboboxRef = useRef<HTMLDivElement | null>(null);
  const allocatedAmountRef = useRef<HTMLInputElement | null>(null);

  const categoryNameValue = watch("categoryName") ?? "";
  const trimmedTyped = categoryNameValue.trim();
  const trimmedTypedLower = trimmedTyped.toLowerCase();

  const filteredSuggestions = useMemo(() => {
    return categoriesForGroup.filter((category) => {
      const nameLower = category.name.toLowerCase();
      if (existingNamesLower.includes(nameLower)) return false;
      if (trimmedTypedLower === "") return true;
      return nameLower.includes(trimmedTypedLower);
    });
  }, [categoriesForGroup, existingNamesLower, trimmedTypedLower]);

  const hasExactMatch = useMemo(
    () =>
      categoriesForGroup.some(
        (category) => category.name.toLowerCase() === trimmedTypedLower,
      ),
    [categoriesForGroup, trimmedTypedLower],
  );

  const showCreateOption = trimmedTypedLower !== "" && !hasExactMatch;

  const items: ComboboxItem[] = useMemo(
    () => [
      ...filteredSuggestions.map(
        (category): ComboboxItem => ({
          type: "suggestion",
          name: category.name,
        }),
      ),
      ...(showCreateOption
        ? [{ type: "create", name: trimmedTyped } as ComboboxItem]
        : []),
    ],
    [filteredSuggestions, showCreateOption, trimmedTyped],
  );

  const dropdownVisible = isDropdownOpen && items.length > 0;

  // Reset the highlight whenever the visible item list changes.
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [items.length, dropdownVisible]);

  // Close the dropdown when clicking outside of the combobox.
  useEffect(() => {
    if (!dropdownVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownVisible]);

  const selectItem = (item: ComboboxItem) => {
    setValue("categoryName", item.name, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    allocatedAmountRef.current?.focus();
  };

  const categoryNameField = register("categoryName");
  const allocatedAmountField = register("allocatedAmount", {
    valueAsNumber: true,
  });

  return (
    <div className="group relative rounded-lg border-2 border-dashed border-gray-300 bg-surface-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Add Category</span>
        <Button variant="ghost" onClick={onCancel} title="Cancel">
          <X className="h-4 w-4" />
        </Button>
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
        <div ref={comboboxRef} className="relative">
          <label
            htmlFor="categoryName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Category Name
          </label>
          <input
            type="text"
            id="categoryName"
            {...categoryNameField}
            onChange={(e) => {
              void categoryNameField.onChange(e);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={(e) => {
              if (!dropdownVisible) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % items.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex(
                  (prev) => (prev - 1 + items.length) % items.length,
                );
              } else if (e.key === "Enter") {
                if (highlightedIndex >= 0 && highlightedIndex < items.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  selectItem(items[highlightedIndex]!);
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setIsDropdownOpen(false);
                setHighlightedIndex(-1);
              }
            }}
            autoComplete="off"
            placeholder="e.g., Groceries, Entertainment"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.categoryName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-secondary focus:ring-secondary"
            }`}
            disabled={isLoading}
          />
          {errors.categoryName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.categoryName.message}
            </p>
          )}

          {dropdownVisible && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-300 bg-white py-1 text-sm shadow-lg">
              {filteredSuggestions.map((category, index) => (
                <li key={category.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      selectItem({ type: "suggestion", name: category.name })
                    }
                    className={`block w-full px-3 py-2 text-left text-gray-700 ${
                      highlightedIndex === index
                        ? "bg-secondary/10 text-secondary-950"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
              {showCreateOption && (
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      selectItem({ type: "create", name: trimmedTyped })
                    }
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                      highlightedIndex === filteredSuggestions.length
                        ? "bg-secondary/10"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-gray-900">
                        Create &ldquo;{trimmedTyped}&rdquo;
                      </span>
                      <span className="block text-xs text-gray-500">
                        New category
                      </span>
                    </span>
                  </button>
                </li>
              )}
            </ul>
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
              {...allocatedAmountField}
              ref={(el) => {
                allocatedAmountField.ref(el);
                allocatedAmountRef.current = el;
              }}
              placeholder="0.00"
              className={`w-full rounded-md border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 ${
                errors.allocatedAmount
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-secondary focus:ring-secondary"
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
