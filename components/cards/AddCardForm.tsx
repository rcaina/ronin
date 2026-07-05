"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CardType } from "@prisma/client";
import { X, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../Button";
import type { Card } from "@/lib/types/card";
import { CARD_TYPE_LABELS } from "@/lib/utils/cards";

// Validation schema
const cardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  lastFourDigits: z
    .string()
    .regex(/^\d{4}$/, "Must be exactly 4 digits")
    .optional()
    .or(z.literal("")),
  cardType: z.nativeEnum(CardType),
  spendingLimit: z.string().optional(),
  userId: z.string().min(1, "User is required"),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CardToEdit {
  id: string;
  name: string;
  lastFourDigits?: string | null;
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
  /** General (template) cards to suggest while typing a new card's name. */
  suggestions?: Card[];
  /** Names already present in the budget, excluded from suggestions. */
  existingCardNames?: string[];
}

type ComboboxItem =
  | { type: "suggestion"; card: Card }
  | { type: "create"; name: string };

export default function AddCardForm({
  onSubmit,
  onCancel,
  isLoading = false,
  cardToEdit,
  users = [],
  loadingUsers = false,
  defaultValues,
  suggestions,
  existingCardNames = [],
}: AddCardFormProps) {
  const isEditing = !!cardToEdit;
  const showCombobox = !!suggestions && !isEditing;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      lastFourDigits: "",
      cardType: CardType.CREDIT,
      spendingLimit: "",
      userId: "",
      ...defaultValues,
    },
  });

  const existingNamesLower = useMemo(
    () => existingCardNames.map((name) => name.toLowerCase()),
    [existingCardNames],
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const comboboxRef = useRef<HTMLDivElement | null>(null);
  const lastFourDigitsRef = useRef<HTMLInputElement | null>(null);

  const nameValue = watch("name") ?? "";
  const trimmedTyped = nameValue.trim();
  const trimmedTypedLower = trimmedTyped.toLowerCase();

  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    return suggestions.filter((card) => {
      const nameLower = card.name.toLowerCase();
      if (existingNamesLower.includes(nameLower)) return false;
      if (trimmedTypedLower === "") return true;
      return nameLower.includes(trimmedTypedLower);
    });
  }, [suggestions, existingNamesLower, trimmedTypedLower]);

  const hasExactMatch = useMemo(
    () =>
      (suggestions ?? []).some(
        (card) => card.name.toLowerCase() === trimmedTypedLower,
      ),
    [suggestions, trimmedTypedLower],
  );

  const showCreateOption = trimmedTypedLower !== "" && !hasExactMatch;

  const items: ComboboxItem[] = useMemo(
    () => [
      ...filteredSuggestions.map(
        (card): ComboboxItem => ({ type: "suggestion", card }),
      ),
      ...(showCreateOption
        ? [{ type: "create", name: trimmedTyped } as ComboboxItem]
        : []),
    ],
    [filteredSuggestions, showCreateOption, trimmedTyped],
  );

  const dropdownVisible = showCombobox && isDropdownOpen && items.length > 0;

  // Reset the highlight whenever the visible item list changes.
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [items.length, dropdownVisible]);

  // Close the dropdown when clicking outside of the combobox.
  useEffect(() => {
    if (!dropdownVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownVisible]);

  const selectItem = (item: ComboboxItem) => {
    if (item.type === "suggestion") {
      setValue("name", item.card.name, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue("lastFourDigits", item.card.lastFourDigits ?? "", {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue("cardType", item.card.cardType, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue(
        "spendingLimit",
        item.card.spendingLimit != null ? String(item.card.spendingLimit) : "",
        { shouldValidate: true, shouldDirty: true },
      );
      setValue("userId", item.card.userId, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      setValue("name", item.name, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    lastFourDigitsRef.current?.focus();
  };

  const nameField = register("name");
  const lastFourDigitsField = register("lastFourDigits");

  return (
    <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-surface-card p-6 shadow-sm">
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
        <div ref={comboboxRef} className="relative">
          <label
            htmlFor="cardName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Card Name
          </label>
          <input
            type="text"
            id="cardName"
            {...nameField}
            onChange={(e) => {
              void nameField.onChange(e);
              if (showCombobox) setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (showCombobox) setIsDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (!dropdownVisible) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % items.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex(
                  (prev) => (prev - 1 + items.length) % items.length,
                );
              } else if (e.key === "Enter") {
                if (highlightedIndex >= 0 && highlightedIndex < items.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  selectItem(items[highlightedIndex]!);
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setIsDropdownOpen(false);
                setHighlightedIndex(-1);
              }
            }}
            autoComplete="off"
            placeholder="e.g., Chase Sapphire, Bank of America"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-secondary focus:ring-secondary"
            }`}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}

          {dropdownVisible && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-300 bg-white py-1 text-sm shadow-lg">
              {filteredSuggestions.map((card, index) => {
                const secondaryParts = [
                  ...(card.lastFourDigits
                    ? [`•••• ${card.lastFourDigits}`]
                    : []),
                  CARD_TYPE_LABELS[card.cardType],
                ];
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectItem({ type: "suggestion", card })}
                      className={`block w-full px-3 py-2 text-left ${
                        highlightedIndex === index
                          ? "bg-secondary/10 text-secondary-950"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="block truncate text-gray-700">
                        {card.name}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {secondaryParts.join(" • ")}
                      </span>
                    </button>
                  </li>
                );
              })}
              {showCreateOption && (
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      selectItem({ type: "create", name: trimmedTyped })
                    }
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                      highlightedIndex === filteredSuggestions.length
                        ? "bg-secondary/10"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-gray-900">
                        Create &ldquo;{trimmedTyped}&rdquo;
                      </span>
                      <span className="block text-xs text-gray-500">
                        New card
                      </span>
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Last 4 Digits */}
        <div>
          <label
            htmlFor="lastFourDigits"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Last 4 Digits (Optional)
          </label>
          <input
            type="text"
            id="lastFourDigits"
            inputMode="numeric"
            maxLength={4}
            {...lastFourDigitsField}
            ref={(el) => {
              lastFourDigitsField.ref(el);
              lastFourDigitsRef.current = el;
            }}
            placeholder="1234"
            className={`w-full rounded-md border px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-1 ${
              errors.lastFourDigits
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-secondary focus:ring-secondary"
            }`}
            disabled={isLoading}
          />
          {errors.lastFourDigits && (
            <p className="mt-1 text-sm text-red-600">
              {errors.lastFourDigits.message}
            </p>
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
                  : "border-gray-300 focus:border-secondary focus:ring-secondary"
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
                : "border-gray-300 focus:border-secondary focus:ring-secondary"
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
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
