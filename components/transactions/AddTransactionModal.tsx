"use client";

import { Plus } from "lucide-react";
import TransactionForm from "./TransactionForm";

interface AddTransactionModalProps {
  budgetId: string;
  onSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTransactionModal({
  budgetId,
  onSuccess,
  isOpen,
  onClose,
}: AddTransactionModalProps) {
  const handleSuccess = () => {
    onSuccess?.();
    // Don't close the modal automatically to allow adding multiple transactions
  };

  return (
    <>
      <button
        onClick={onClose}
        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Transaction
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
            <TransactionForm
              onClose={onClose}
              onSuccess={handleSuccess}
              budgetId={budgetId}
            />
          </div>
        </div>
      )}
    </>
  );
}
