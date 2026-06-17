import { CreditCard, DollarSign, Edit, Trash2, CopyIcon } from "lucide-react";
import type { Card } from "@/lib/utils/cards";
import { formatCurrency, roundToCents } from "@/lib/utils";

interface CardProps {
  card: Card;
  onEdit?: (card: Card) => void;
  onCopy?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  canEdit?: boolean;
  onClick?: (card: Card) => void;
  general?: boolean;
}

const getCardTypeIcon = (type: string) => {
  return type === "credit" ? (
    <CreditCard className="h-4 w-4" />
  ) : (
    <DollarSign className="h-4 w-4" />
  );
};

const getUtilizationPercentage = (
  amountSpent: number,
  spendingLimit?: number,
) => {
  if (!spendingLimit) return 0;
  return (amountSpent / spendingLimit) * 100;
};

const getUtilizationColor = (percentage: number) => {
  if (percentage > 80) return "text-red-600";
  if (percentage > 60) return "text-amber-600";
  return "text-green-600";
};

const CardComponent = ({
  card,
  onEdit,
  onCopy,
  onDelete,
  canEdit = true,
  onClick,
  general = false,
}: CardProps) => {
  return (
    <div
      className={`card-interactive group relative cursor-pointer overflow-hidden ${
        !card.isActive ? "opacity-60" : ""
      }`}
      onClick={() => onClick?.(card)}
    >
      {/* Card face — styled like a physical payment card */}
      <div className={`relative overflow-hidden ${card.color} p-5 text-white`}>
        {/* Soft decorative shapes */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-36 w-36 rounded-full bg-black/10" />

        <div className="relative mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCardTypeIcon(card.type)}
            <span className="text-xs font-semibold uppercase tracking-widest text-white/90">
              {card.type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`rounded-lg p-1.5 transition-all duration-200 ${
                canEdit
                  ? "opacity-100 hover:bg-white/20 lg:opacity-0 lg:group-hover:opacity-100"
                  : "cursor-not-allowed opacity-50"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) {
                  onCopy?.(card);
                }
              }}
              title={canEdit ? "Copy" : "Only owner can edit"}
              disabled={!canEdit}
            >
              <CopyIcon className="h-4 w-4" />
            </button>

            {canEdit && (
              <button
                className="rounded-lg p-1.5 opacity-100 transition-all duration-200 hover:bg-white/20 lg:opacity-0 lg:group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(card);
                }}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            <button
              className={`rounded-lg p-1.5 transition-all duration-200 ${
                canEdit
                  ? "opacity-100 hover:bg-white/20 hover:text-red-200 lg:opacity-0 lg:group-hover:opacity-100"
                  : "cursor-not-allowed opacity-50"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) {
                  onDelete?.(card);
                }
              }}
              title={canEdit ? "Delete card" : "Only owner can edit"}
              disabled={!canEdit}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chip */}
        <div className="relative mb-5">
          <div className="h-7 w-9 rounded-md bg-gradient-to-br from-accent-100 to-secondary-400 shadow-soft">
            <div className="mx-auto mt-2 h-3 w-6 rounded-sm border border-secondary-700/40" />
          </div>
        </div>

        {/* Card number */}
        {card.lastFourDigits && (
          <div className="relative mb-5 font-mono text-sm tracking-widest text-white/90">
            •••• •••• •••• {card.lastFourDigits}
          </div>
        )}

        {/* Card holder */}
        <div className="relative flex items-end justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-white/70">
              Owner
            </div>
            <div className="text-sm font-semibold tracking-wide">
              {card.user}
            </div>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            {card.name}
          </h3>
          {/* Status Badge */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              card.isActive
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {card.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Balance and Limit */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            {card.spendingLimit && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Limit</span>
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatCurrency(card.spendingLimit)}
                </span>
              </div>
            )}
            {!general && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Spent</span>
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatCurrency(card.amountSpent)}
                </span>
              </div>
            )}
            {card.spendingLimit &&
              !general &&
              (() => {
                const available = roundToCents(
                  card.spendingLimit - card.amountSpent,
                );
                return (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Available</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        available >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(available)}
                    </span>
                  </div>
                );
              })()}
          </div>

          {/* Utilization Bar */}
          {card.spendingLimit && !general && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500">Utilization</span>
                <span
                  className={`font-medium tabular-nums ${getUtilizationColor(
                    getUtilizationPercentage(
                      card.amountSpent,
                      card.spendingLimit,
                    ),
                  )}`}
                >
                  {getUtilizationPercentage(
                    card.amountSpent,
                    card.spendingLimit,
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    getUtilizationPercentage(
                      card.amountSpent,
                      card.spendingLimit,
                    ) > 80
                      ? "bg-red-500"
                      : getUtilizationPercentage(
                            card.amountSpent,
                            card.spendingLimit,
                          ) > 60
                        ? "bg-amber-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      getUtilizationPercentage(
                        card.amountSpent,
                        card.spendingLimit,
                      ),
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardComponent;
export type { Card as CardData };
