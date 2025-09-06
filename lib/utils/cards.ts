import { CardType } from "@prisma/client";
import type { Card as ApiCard } from "../data-hooks/services/cards";

// Component interface for cards
export interface Card {
  id: string;
  name: string;
  type: "credit" | "debit" | "business_credit" | "business_debit" | "cash";
  amountSpent: number;
  spendingLimit?: number;
  userId: string;
  user: string;
  isActive: boolean;
  color: string;
}

// Array of different gradient colors for cards
export const cardColors = [
  "bg-gradient-to-br from-blue-600 to-purple-600",
  "bg-gradient-to-br from-green-600 to-teal-600",
  "bg-gradient-to-br from-red-600 to-pink-600",
  "bg-gradient-to-br from-yellow-600 to-orange-600",
  "bg-gradient-to-br from-indigo-600 to-blue-600",
  "bg-gradient-to-br from-purple-600 to-pink-600",
  "bg-gradient-to-br from-emerald-600 to-green-600",
  "bg-gradient-to-br from-rose-600 to-red-600",
  "bg-gradient-to-br from-cyan-600 to-blue-600",
  "bg-gradient-to-br from-violet-600 to-purple-600",
  "bg-gradient-to-br from-amber-600 to-yellow-600",
  "bg-gradient-to-br from-sky-600 to-cyan-600",
];

/**
 * Generates a consistent color for a card based on its user ID
 * @param userId - The unique identifier for the user who owns the card
 * @returns A Tailwind CSS gradient class
 */
export const getCardColor = (userId: string): string => {
  if (!userId) {
    return cardColors[0] ?? "bg-gradient-to-br from-blue-600 to-purple-600"; // Default to first color if no ID
  }
  
  // Use the user ID to generate a consistent index
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % cardColors.length;
  
  const selectedColor = cardColors[index];
  if (!selectedColor) {
    return cardColors[0] ?? "bg-gradient-to-br from-blue-600 to-purple-600"; // Fallback to first color
  }
  
  return selectedColor;
};

/**
 * Maps card type from API format to component format
 * @param cardType - The card type from the API
 * @returns The card type for the component
 */
export const mapCardType = (cardType: string): "credit" | "debit" | "business_credit" | "business_debit" | "cash" => {
  switch (cardType) {
    case CardType.CREDIT:
      return "credit";
    case CardType.BUSINESS_CREDIT:
      return "business_credit";
    case CardType.DEBIT:
      return "debit";
    case CardType.BUSINESS_DEBIT:
      return "business_debit";
    default:
      return "cash";
  }
}; 

// Utility function to map API card to component card
export const mapApiCardToCard = (apiCard: ApiCard): Card => {
    const cardColor = getCardColor(apiCard.userId);
    
    return {
      id: apiCard.id ?? "",
      name: apiCard.name,
      type: mapCardType(apiCard.cardType),
      amountSpent: apiCard.amountSpent ?? 0,
      spendingLimit: apiCard.spendingLimit,
      userId: apiCard.userId,
      user: apiCard.user?.name ?? "Unknown User",
      isActive: true, // Placeholder, replace with real status if available
      color: cardColor,
    };
  };