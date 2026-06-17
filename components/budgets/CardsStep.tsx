"use client";

import { CreditCard, Info, Plus, Trash2 } from "lucide-react";
import type { CardToInclude } from "./types";
import { mapCardType } from "@/lib/utils/cards";

interface CardsStepProps {
  cardsToInclude: CardToInclude[];
  onRemoveCard: (id: string) => void;
  onOpenAddCard?: () => void;
  isDuplicating?: boolean;
}

export default function CardsStep({
  cardsToInclude,
  onRemoveCard,
  onOpenAddCard,
  isDuplicating = false,
}: CardsStepProps) {
  const list: CardToInclude[] = cardsToInclude;
  const hasCards = list.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-secondary-50 p-4 text-sm text-secondary-800">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-medium">
            Cards are optional and can be managed later.
          </p>
          <p className="mt-1 text-xs text-secondary-900/80">
            We&apos;ll always create a main debit card for your budget so income
            has somewhere to land. Add cards below or remove any you don&apos;t
            want; you can also manage cards from the Cards tab after the budget
            is created.
          </p>
        </div>
      </div>

      {hasCards ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {isDuplicating
                ? "Cards to copy (remove any you don't want)"
                : "Cards to add to this budget"}
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((card) => (
              <div
                key={card.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-surface-card p-3 shadow-sm"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-950 text-white">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {card.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mapCardType(card.cardType)}
                        {card.lastFourDigits
                          ? ` •••• ${card.lastFourDigits}`
                          : ""}
                      </p>
                    </div>
                    {card.spendingLimit != null && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Limit</p>
                        <p className="text-sm font-semibold text-gray-900">
                          ${card.spendingLimit.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {card.user && (
                    <p className="mt-1 text-xs text-gray-500">
                      Assigned to{" "}
                      <span className="font-medium">
                        {card.user.firstName && card.user.lastName
                          ? `${card.user.firstName} ${card.user.lastName}`
                          : (card.user.name ?? "Unknown user")}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCard(card.id)}
                  className="mt-0.5 flex-shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Remove card"
                  aria-label={`Remove ${card.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-surface-card px-4 py-8 text-center">
          <CreditCard className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-900">
            {isDuplicating ? "No cards will be copied" : "No cards added yet"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {isDuplicating
              ? "Add new cards below or continue without copying any."
              : 'We\'ll create a default debit card named "Main". Add more below or continue.'}
          </p>
        </div>
      )}

      {onOpenAddCard && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onOpenAddCard}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-surface-card px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        When you click <span className="font-semibold">Continue</span>,
        you&apos;ll move on. You can always adjust cards later from the
        budget&apos;s Cards page.
      </p>
    </div>
  );
}
