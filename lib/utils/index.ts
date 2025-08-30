import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CategoryType, PeriodType } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export hooks
export { useDebounce } from "./hooks";

/**
 * Rounds a number to 2 decimal places to avoid floating-point precision issues
 * @param value - The number to round
 * @returns The rounded number
 */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Safely adds monetary values to avoid floating-point precision issues
 * @param values - Array of values to sum
 * @returns The rounded sum
 */
export function sumMonetaryValues(values: number[]): number {
  const sum = values.reduce((acc, val) => acc + val, 0);
  return roundToCents(sum);
}

/**
 * Calculates the adjusted income amount based on income frequency and budget period
 * @param amount - The base income amount
 * @param incomeFrequency - The frequency of the income (weekly, monthly, etc.)
 * @param budgetPeriod - The period of the budget (weekly, monthly, etc.)
 * @returns The adjusted income amount for the budget period
 */
export function calculateAdjustedIncome(
  amount: number,
  incomeFrequency: PeriodType,
  budgetPeriod: PeriodType
): number {
  // If frequencies match, return the original amount
  if (incomeFrequency === budgetPeriod) {
    return roundToCents(amount);
  }

  // Handle ONE_TIME income - it's a one-time payment regardless of budget period
  if (incomeFrequency === PeriodType.ONE_TIME) {
    return roundToCents(amount);
  }

  // Convert everything to a common base (weeks) for calculation
  const getWeeksInPeriod = (period: PeriodType): number => {
    switch (period) {
      case PeriodType.WEEKLY:
        return 1;
      case PeriodType.MONTHLY:
        return 4.33; // Average weeks per month (52 weeks / 12 months)
      case PeriodType.QUARTERLY:
        return 13; // 3 months * 4.33 weeks
      case PeriodType.YEARLY:
        return 52; // 52 weeks per year
      case PeriodType.ONE_TIME:
        return 0; // One-time payments don't repeat
      default:
        return 1;
    }
  };

  const incomeWeeks = getWeeksInPeriod(incomeFrequency);
  const budgetWeeks = getWeeksInPeriod(budgetPeriod);

  // If income frequency is longer than budget period, calculate how many times it occurs
  if (incomeWeeks > budgetWeeks) {
    const result = (amount / incomeWeeks) * budgetWeeks;
    return roundToCents(result);
  }

  // If income frequency is shorter than budget period, calculate how many times it occurs
  // Round up to ensure users get the full amount for partial periods
  const multiplier = budgetWeeks / incomeWeeks;
  const result = Math.ceil(multiplier) * amount;
  return roundToCents(result);
}

/**
 * Get consistent color for category groups across the application
 * @param group - The category group type (optional)
 * @returns Tailwind CSS class for the group color
 */
export const getGroupColor = (group?: CategoryType) => {
  if (!group) {
    return "bg-black text-white";
  }
  
  switch (group) {
    case CategoryType.NEEDS:
      return "bg-blue-500";
    case CategoryType.WANTS:
      return "bg-purple-500";
    case CategoryType.INVESTMENT:
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

/**
 * Get consistent badge colors for category groups across the application
 * @param group - The category group type (optional)
 * @returns Tailwind CSS classes for the badge styling
 */
export const getCategoryBadgeColor = (group?: CategoryType) => {
  if (!group) {
    return "bg-black text-white";
  }
  
  switch (group) {
    case CategoryType.NEEDS:
      return "bg-blue-100 text-blue-800";
    case CategoryType.WANTS:
      return "bg-purple-100 text-purple-600";
    case CategoryType.INVESTMENT:
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function formatDateUTC(dateString: string): string {
  if (!dateString) return "";

  // Handle both ISO date strings and simple date strings
  let year: number, month: number, day: number;

  if (dateString.includes("T")) {
    // ISO date string - extract date part
    const datePart = dateString.split("T")[0] ?? "";
    [year, month, day] = datePart.split("-").map(Number) as [number, number, number];
  } else {
    // Simple date string (YYYY-MM-DD)
    [year, month, day] = dateString.split("-").map(Number) as [number, number, number];
  }

  if (!year || !month || !day) return "";

  // Create UTC date to avoid timezone issues
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(utcDate);
}

// Utility functions for smart date calculation
export const calculateEndDate = (startDate: Date, period: PeriodType): Date => {
  const date = new Date(startDate);

  switch (period) {
    case PeriodType.WEEKLY:
      // Find the end of the week (Sunday)
      const dayOfWeek = date.getDay();
      const daysToAdd = 6 - dayOfWeek;
      date.setDate(date.getDate() + daysToAdd);
      return date;

    case PeriodType.MONTHLY:
      // Find the last day of the current month
      const year = date.getFullYear();
      const month = date.getMonth();
      // Create a date for the first day of the next month, then subtract 1 day
      const firstDayNextMonth = new Date(year, month + 1, 1);
      const lastDay = new Date(firstDayNextMonth);
      lastDay.setDate(lastDay.getDate() - 1);
      return lastDay;

    case PeriodType.QUARTERLY:
      // Calculate 3 months after the start date
      const quarterlyEndDate = new Date(startDate);
      quarterlyEndDate.setMonth(quarterlyEndDate.getMonth() + 3);
      // Subtract 1 day to get the day before the 3-month mark
      quarterlyEndDate.setDate(quarterlyEndDate.getDate());
      return quarterlyEndDate;

    case PeriodType.YEARLY:
      // Find the last day of the current year
      date.setMonth(11, 31); // December 31st
      return date;

    case PeriodType.ONE_TIME:
      // For one-time, return the same date (user will manually set end date)
      return date;

    default:
      return date;
  }
};