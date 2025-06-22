import { CardType } from "@prisma/client";
import { X, Check } from "lucide-react";

interface CardFormData {
  name: string;
  cardType: CardType;
  spendingLimit: string;
  userId: string;
}

interface AddCardFormProps {
  formData: CardFormData;
  onFormChange: (field: keyof CardFormData, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AddCardForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  isLoading = false,
}: AddCardFormProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">New Card</span>
        <button
          onClick={onCancel}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {/* Card Name */}
        <div>
          <label
            htmlFor="cardName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Card Name
          </label>
          <input
            type="text"
            id="cardName"
            value={formData.name}
            onChange={(e) => onFormChange("name", e.target.value)}
            placeholder="e.g., Chase Sapphire, Bank of America"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
        </div>

        {/* Card Type */}
        <div>
          <label
            htmlFor="cardType"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Card Type
          </label>
          <select
            id="cardType"
            value={formData.cardType}
            onChange={(e) =>
              onFormChange(
                "cardType",
                e.target.value as CardFormData["cardType"],
              )
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value={CardType.CREDIT}>Credit Card</option>
            <option value={CardType.DEBIT}>Debit Card</option>
            <option value={CardType.CASH}>Cash</option>
            <option value={CardType.BUSINESS_CREDIT}>Business Credit</option>
            <option value={CardType.BUSINESS_DEBIT}>Business Debit</option>
          </select>
        </div>

        {/* Spending Limit */}
        <div>
          <label
            htmlFor="spendingLimit"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Spending Limit (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-gray-500">
              $
            </span>
            <input
              type="number"
              id="spendingLimit"
              value={formData.spendingLimit}
              onChange={(e) => onFormChange("spendingLimit", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isLoading ? "Creating..." : "Create Card"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
