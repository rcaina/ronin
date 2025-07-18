import { CreditCard, DollarSign, Edit, Trash2, CopyIcon } from "lucide-react";
import type { Card } from "@/lib/utils/cards";

interface CardProps {
  card: Card;
  onEdit?: (card: Card) => void;
  onCopy?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  canEdit?: boolean;
  onClick?: (card: Card) => void;
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
  if (percentage > 60) return "text-yellow-600";
  return "text-green-600";
};

const CardComponent = ({
  card,
  onEdit,
  onCopy,
  onDelete,
  canEdit = true,
  onClick,
}: CardProps) => {
  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
        !card.isActive ? "opacity-60" : ""
      }`}
      onClick={() => onClick?.(card)}
    >
      {/* Card Header */}
      <div className={`${card.color} p-6 text-white`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCardTypeIcon(card.type)}
            <span className="text-sm font-medium uppercase">{card.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md p-1 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onCopy?.(card);
              }}
              title="Copy"
            >
              <CopyIcon className="h-4 w-4" />
            </button>
            {canEdit && (
              <>
                <button
                  className="rounded-md p-1 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(card);
                  }}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  className="rounded-md p-1 text-red-300 opacity-0 transition-opacity hover:bg-white/20 hover:text-red-500 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(card);
                  }}
                  title="Delete card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card Name */}
        <div className="mb-4">
          <div className="text-sm text-white/80">Card Name</div>
          <div className="text-lg font-semibold">{card.name}</div>
        </div>

        {/* Card Details */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/80">Owner</div>
            <div className="font-semibold">{card.user}</div>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{card.name}</h3>
        </div>

        {/* Balance and Limit */}
        <div className="space-y-3">
          <div>
            {card.spendingLimit && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Limit</span>
                <span className="font-semibold text-gray-900">
                  ${card.spendingLimit.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Spent</span>
              <span className="font-semibold text-red-500">
                ${card.amountSpent.toFixed(2)}
              </span>
            </div>
            {card.spendingLimit && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Available</span>
                <span
                  className={`font-semibold ${
                    card.spendingLimit - card.amountSpent >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  ${(card.spendingLimit - card.amountSpent).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Utilization Bar */}
          {card.spendingLimit && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-500">Utilization</span>
                <span
                  className={`font-medium ${getUtilizationColor(
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
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    getUtilizationPercentage(
                      card.amountSpent,
                      card.spendingLimit,
                    ) > 80
                      ? "bg-red-500"
                      : getUtilizationPercentage(
                            card.amountSpent,
                            card.spendingLimit,
                          ) > 60
                        ? "bg-yellow-500"
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

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                card.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {card.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardComponent;
export type { Card as CardData };
