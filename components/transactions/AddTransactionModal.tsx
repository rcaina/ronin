"use client";

import TransactionForm from "./TransactionForm";

interface AddTransactionModalProps {
  budgetId?: string; // Optional budget ID to pre-select
  cardId?: string; // Optional card ID to pre-select
  onSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
  isIncome?: boolean; // If true, this is for income transactions
}

export default function AddTransactionModal({
  budgetId,
  cardId,
  onSuccess,
  isOpen,
  onClose,
  isIncome = false,
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
              cardId={cardId}
              isIncome={isIncome}
            />
          </div>
        </div>
      )}
    </>
  );
}
