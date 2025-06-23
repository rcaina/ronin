"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { CardType } from "@prisma/client";
import { useCreateCard, useUpdateCard } from "@/lib/data-hooks/cards/useCards";

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

interface Card {
  id: string;
  name: string;
  cardType: CardType;
  amountSpent?: number;
  spendingLimit?: number;
  userId: string;
  user: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
  };
  deleted?: string;
  createdAt: string;
  updatedAt: string;
}

const cardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.string().optional(),
  userId: z.string().min(1, "User is required"),
});

type CardForm = z.infer<typeof cardSchema>;

interface AddEditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardCreated: () => void;
  onCardUpdated: () => void;
  cardToEdit?: Card | null;
}

export default function AddEditCardModal({
  isOpen,
  onClose,
  onCardCreated,
  onCardUpdated,
  cardToEdit,
}: AddEditCardModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const createCardMutation = useCreateCard();
  const updateCardMutation = useUpdateCard();

  const isEditing = !!cardToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      cardType: "CREDIT",
      spendingLimit: undefined,
      userId: "",
    },
  });

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const usersData = (await response.json()) as User[];
      setUsers(usersData);

      // If there's only one user and we're not editing, default to them
      if (usersData.length === 1 && usersData[0] && !isEditing) {
        setValue("userId", usersData[0].id);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isEditing, setValue]);

  // Reset form when modal opens/closes or when editing card changes
  useEffect(() => {
    if (isOpen) {
      void fetchUsers();
      if (isEditing && cardToEdit) {
        // Pre-fill form with card data when editing
        setValue("name", cardToEdit.name);
        setValue("cardType", cardToEdit.cardType);
        setValue("spendingLimit", cardToEdit.spendingLimit?.toString() ?? "");
        setValue("userId", cardToEdit.userId);
      } else {
        // Reset form for new card
        reset({
          name: "",
          cardType: "CREDIT",
          spendingLimit: undefined,
          userId: "",
        });
      }
    }
  }, [isOpen, isEditing, cardToEdit, setValue, reset, fetchUsers]);

  const onSubmit = async (data: CardForm) => {
    setError(null);

    try {
      // Convert empty string to undefined for spendingLimit
      const cardData = {
        ...data,
        spendingLimit:
          data.spendingLimit === "" ? undefined : Number(data.spendingLimit),
        cardType: data.cardType as CardType,
      };

      if (isEditing && cardToEdit) {
        await updateCardMutation.mutateAsync({
          id: cardToEdit.id,
          data: cardData,
        });
        onCardUpdated();
      } else {
        await createCardMutation.mutateAsync(cardData);
        onCardCreated();
      }

      reset();
      onClose();
    } catch (err: unknown) {
      let message = isEditing
        ? "Failed to update card"
        : "Failed to create card";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message ?? message;
      }
      setError(message);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const isSubmitting =
    createCardMutation.isPending || updateCardMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Card" : "Add New Card"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Card Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Chase Sapphire Preferred"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700"
            >
              User
            </label>
            <select
              id="userId"
              {...register("userId")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loadingUsers}
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

          <div>
            <label
              htmlFor="cardType"
              className="block text-sm font-medium text-gray-700"
            >
              Card Type
            </label>
            <select
              id="cardType"
              {...register("cardType")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CREDIT">Credit Card</option>
              <option value="DEBIT">Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="BUSINESS_CREDIT">Business Credit Card</option>
              <option value="BUSINESS_DEBIT">Business Debit Card</option>
            </select>
            {errors.cardType && (
              <p className="mt-1 text-sm text-red-600">
                {errors.cardType.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="spendingLimit"
              className="block text-sm font-medium text-gray-700"
            >
              Spending Limit (Optional)
            </label>
            <input
              id="spendingLimit"
              type="number"
              step="0.01"
              min="0"
              {...register("spendingLimit")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 5000"
            />
            {errors.spendingLimit && (
              <p className="mt-1 text-sm text-red-600">
                {errors.spendingLimit.message}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
