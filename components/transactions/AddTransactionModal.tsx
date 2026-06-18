"use client";

import TransactionForm from "./TransactionForm";
import { useLockBodyScroll } from "@/lib/utils/hooks";

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

  useLockBodyScroll(isOpen);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto overscroll-contain">
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
