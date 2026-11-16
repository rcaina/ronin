"use client";

import Modal from "@/components/Modal";
import TransactionForm from "./TransactionForm";
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        transaction
          ? "Edit transaction"
          : isIncome
            ? "Add new income"
            : "Add transaction"
      }
      maxWidth="max-w-4xl"
    >
      <TransactionForm
        onClose={onClose}
        onSuccess={handleSuccess}
        budgetId={budgetId}
        cardId={cardId}
        isIncome={isIncome}
        transaction={transaction}
      />
    </Modal>
  );
}
