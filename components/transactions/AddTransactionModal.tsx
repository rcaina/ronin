"use client";

import TransactionForm from "./TransactionForm";
import { useLockBodyScroll } from "@/lib/utils/hooks";
import type { TransactionWithRelations } from "@/lib/types/transaction";

interface AddTransactionModalProps {
  budgetId?: string; // Optional budget ID to pre-select
  cardId?: string; // Optional card ID to pre-select
  onSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
  isIncome?: boolean; // If true, this is for income transactions
  /** When provided, the form opens in edit mode for this transaction instead
   * of creating a new one. Used as the "full edit" path for split
   * transactions, which the inline editors don't support. */
  transaction?: TransactionWithRelations;
}

export default function AddTransactionModal({
  budgetId,
  cardId,
  onSuccess,
  isOpen,
  onClose,
  isIncome = false,
  transaction,
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
              transaction={transaction}
            />
          </div>
        </div>
      )}
    </>
  );
}
