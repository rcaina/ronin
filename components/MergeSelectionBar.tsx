"use client";

import { Merge } from "lucide-react";
import Button from "@/components/Button";

interface MergeSelectionBarProps {
  /** Number of items currently selected for the merge. */
  selectedCount: number;
  /** Plural noun for the items being merged, e.g. "categories" / "cards". */
  itemNoun: string;
  onMerge: () => void;
  /** Minimum number of selected items required before merging is allowed. */
  minRequired?: number;
}

/**
 * Sticky bottom action bar shown while a "merge" selection mode is active.
 * Sticks to the bottom of the scrollable content, offset above the mobile
 * bottom tab bar (~56px + safe area) so it never sits underneath it. Shared
 * by the categories and cards pages so both merge flows look identical.
 */
export default function MergeSelectionBar({
  selectedCount,
  itemNoun,
  onMerge,
  minRequired = 2,
}: MergeSelectionBarProps) {
  return (
    <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 mx-2 mb-2 flex items-center justify-between gap-3 rounded-2xl border border-gray-200/70 bg-surface-card/95 p-3 shadow-lifted backdrop-blur-md sm:mx-4 sm:p-4 lg:sticky lg:bottom-4 lg:mx-0">
      <span className="text-sm font-medium text-gray-700">
        {selectedCount === 0
          ? `Select ${itemNoun} to merge`
          : `${selectedCount} selected`}
      </span>
      <Button
        variant="primary"
        onClick={onMerge}
        disabled={selectedCount < minRequired}
      >
        <Merge className="mr-2 h-4 w-4" />
        Merge{selectedCount >= minRequired ? ` ${selectedCount}` : ""}{" "}
        {itemNoun}
      </Button>
    </div>
  );
}
