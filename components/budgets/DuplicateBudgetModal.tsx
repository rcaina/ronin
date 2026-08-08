"use client";

import { Copy, SlidersHorizontal } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";

interface DuplicateBudgetModalProps {
  isOpen: boolean;
  budgetName: string;
  isDuplicating?: boolean;
  onClose: () => void;
  onQuickDuplicate: () => void;
  onCustomize: () => void;
}

export default function DuplicateBudgetModal({
  isOpen,
  budgetName,
  isDuplicating = false,
  onClose,
  onQuickDuplicate,
  onCustomize,
}: DuplicateBudgetModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate budget">
      <p className="mb-5 text-sm text-gray-500">
        Copy <span className="font-medium text-gray-900">{budgetName}</span>{" "}
        with its cards, income, and categories.
      </p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={onQuickDuplicate}
          isLoading={isDuplicating}
          className="w-full py-3"
        >
          {!isDuplicating && <Copy className="mr-2 h-4 w-4" />}
          {isDuplicating ? "Duplicating..." : "Quick duplicate"}
        </Button>
        <Button
          variant="outline"
          onClick={onCustomize}
          disabled={isDuplicating}
          className="w-full py-3"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Customize first
        </Button>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Quick duplicate creates the copy right away and opens it so you can
        adjust anything. Customize first walks through the full setup.
      </p>
    </Modal>
  );
}
