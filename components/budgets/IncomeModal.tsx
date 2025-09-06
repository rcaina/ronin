"use client";

import type { PeriodType } from "@prisma/client";
import IncomeForm from "./IncomeForm";

interface Income {
  id: string;
  amount: number;
  source: string | null;
  description: string | null;
  isPlanned: boolean;
  frequency: PeriodType;
}

interface IncomeModalProps {
  isOpen: boolean;
  budgetId: string;
  income?: Income; // For editing a specific income
  onClose: () => void;
  onSuccess: () => void;
}

export default function IncomeModal({
  isOpen,
  budgetId,
  income,
  onClose,
  onSuccess,
}: IncomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <IncomeForm
          onClose={onClose}
          onSuccess={onSuccess}
          income={income}
          budgetId={budgetId}
        />
      </div>
    </div>
  );
}
