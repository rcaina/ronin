"use client";

import { CreditCard, Info } from "lucide-react";
import type { BudgetWithRelations } from "@/lib/types/budget";
import { mapCardType } from "@/lib/utils/cards";

interface CardsStepProps {
  initialBudget?: BudgetWithRelations | null;
  selectedCardIds: Set<string>;
  onToggleCard: (cardId: string) => void;
}

export default function CardsStep({
  initialBudget,
  selectedCardIds,
  onToggleCard,
}: CardsStepProps) {
  const cards = initialBudget?.cards ?? [];

  const hasCards = cards.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-medium">
            Cards are optional and can be managed later.
          </p>
          <p className="mt-1 text-xs text-blue-900/80">
            We&apos;ll always create a main debit card for your budget so income
            has somewhere to land. You can add additional credit, debit, or cash
            cards from the Cards tab after your budget is created.
          </p>
        </div>
      </div>

      {hasCards ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Cards that will be copied into this budget
            </h3>
            <p className="text-xs text-gray-500">
              Uncheck any cards you don&apos;t want to duplicate.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onToggleCard(card.id)}
                  className="mt-1 h-4 w-4 flex-shrink-0 rounded border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1"
                  aria-pressed={selectedCardIds.has(card.id)}
                >
                  {selectedCardIds.has(card.id) && (
                    <span className="block h-full w-full bg-secondary" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {card.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mapCardType(card.cardType)}
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
                          : card.user.name ?? "Unknown user"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
          <CreditCard className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-900">
            No existing cards to copy
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            We&apos;ll create a default debit card named &quot;Main&quot; for
            this budget. You can add more cards from the Cards tab once the
            budget is created.
          </p>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        When you click <span className="font-semibold">Continue</span>, you&apos;ll
        move on without making any changes to cards. You can always adjust cards
        later from the budget&apos;s Cards page.
      </p>
    </div>
  );
}

