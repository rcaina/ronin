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
