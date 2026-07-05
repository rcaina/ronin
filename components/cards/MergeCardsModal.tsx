"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";
import type { Card } from "@/lib/utils/cards";

const CARD_TYPE_LABELS: Record<Card["type"], string> = {
  credit: "Credit",
  debit: "Debit",
  cash: "Cash",
  business_credit: "Business credit",
  business_debit: "Business debit",
};

interface MergeCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetId: string) => void;
  cards: Card[];
  targetId: string | null;
  onSelectTarget: (id: string) => void;
  isLoading?: boolean;
}

const MergeCardsModal = ({
  isOpen,
  onClose,
  onConfirm,
  cards,
  targetId,
  onSelectTarget,
  isLoading = false,
}: MergeCardsModalProps) => {
  const handleConfirm = () => {
    if (!targetId) return;
    onConfirm(targetId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge cards"
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!targetId || isLoading}
            isLoading={isLoading}
            className="flex-1"
          >
            {isLoading ? "Merging..." : `Merge ${cards.length} cards`}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-sm text-gray-500">
          Choose which card survives the merge. The other{" "}
          {cards.length > 1 ? `${cards.length - 1} cards` : "card"} will be
          merged into it — their budget cards and transactions move over, and
          the survivor&apos;s name and last four digits replace theirs
          everywhere. This cannot be undone.
        </p>
      </div>

      <div className="space-y-2">
        {cards.map((card) => (
          <label
            key={card.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ease-out ${
              targetId === card.id
                ? "border-secondary bg-secondary/10"
                : "border-gray-200/70 hover:border-gray-300 hover:bg-surface-muted"
            }`}
          >
            <input
              type="radio"
              name="merge-target"
              value={card.id}
              checked={targetId === card.id}
              onChange={() => onSelectTarget(card.id)}
              className="h-4 w-4 shrink-0 border-gray-300 text-secondary focus:ring-secondary"
            />
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${card.color} text-white`}
            >
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-900">
                {card.name}
              </div>
              <div className="truncate text-xs text-gray-500">
                {CARD_TYPE_LABELS[card.type]}
                {card.lastFourDigits ? ` • •••• ${card.lastFourDigits}` : ""}
              </div>
            </div>
            {targetId === card.id && (
              <span className="shrink-0 rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary-700">
                Survivor
              </span>
            )}
          </label>
        ))}
      </div>
    </Modal>
  );
};

export default MergeCardsModal;
