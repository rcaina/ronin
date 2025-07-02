"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CardType } from "@prisma/client";
import { X, Check } from "lucide-react";
import Button from "../Button";

// Validation schema
const cardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.string().optional(),
  userId: z.string().min(1, "User is required"),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CardToEdit {
  id: string;
  name: string;
  cardType: CardType;
  spendingLimit?: number;
  userId: string;
}

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

interface AddCardFormProps {
  onSubmit: (data: CardFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  cardToEdit?: CardToEdit | null;
  users?: User[];
  loadingUsers?: boolean;
  defaultValues?: Partial<CardFormData>;
}

export default function AddCardForm({
  onSubmit,
  onCancel,
  isLoading = false,
  cardToEdit,
  users = [],
  loadingUsers = false,
  defaultValues,
}: AddCardFormProps) {
  const isEditing = !!cardToEdit;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      cardType: CardType.CREDIT,
      spendingLimit: "",
      userId: "",
      ...defaultValues,
    },
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          {isEditing ? "Edit Card" : "New Card"}
        </span>
        <button
          onClick={onCancel}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(onSubmit)();
          }
        }}
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
            {...register("name")}
            placeholder="e.g., Chase Sapphire, Bank of America"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* User Selection - only show if multiple users */}
        {users.length > 1 && (
          <div>
            <label
              htmlFor="userId"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              User
            </label>
            <select
              id="userId"
              {...register("userId")}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.userId
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              disabled={isLoading || loadingUsers}
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
            {errors.userId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.userId.message}
              </p>
            )}
          </div>
        )}

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
            {...register("cardType")}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.cardType
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isLoading}
          >
            <option value={CardType.CREDIT}>Credit Card</option>
            <option value={CardType.DEBIT}>Debit Card</option>
            <option value={CardType.CASH}>Cash</option>
            <option value={CardType.BUSINESS_CREDIT}>Business Credit</option>
            <option value={CardType.BUSINESS_DEBIT}>Business Debit</option>
          </select>
          {errors.cardType && (
            <p className="mt-1 text-sm text-red-600">
              {errors.cardType.message}
            </p>
          )}
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
              {...register("spendingLimit")}
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
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full">
            <Check className="h-4 w-4" />
            {isLoading
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
                ? "Update"
                : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
