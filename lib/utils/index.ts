import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CategoryType, PeriodType } from "@prisma/client";
import type { KeyboardEvent, SyntheticEvent } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Props that make a clickable non-button element focusable and operable with Enter/Space. */
export function pressable(onPress: (e: SyntheticEvent<HTMLElement>) => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      // Keys typed in a nested button or input belong to that control.
      if (e.target !== e.currentTarget) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onPress(e);
    },
  };
}

/**
 * Rounds a number to 2 decimal places to avoid floating-point precision issues
 * @param value - The number to round
 * @returns The rounded number
 */
export function roundToCents(value: number | null | undefined): number {
  if (value == null || typeof value !== "number" || isNaN(value)) {
    return 0;
  }
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
 * Formats a number as US currency (USD)
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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

  // Matches GROUP_COLORS in components/recharts/theme.tsx so chips and charts agree.
  switch (group) {
    case CategoryType.NEEDS:
      return "bg-[#5b7a9d]";
    case CategoryType.WANTS:
      return "bg-secondary";
    case CategoryType.INVESTMENT:
      return "bg-[#6c9a8b]";
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

  // Matches GROUP_COLORS in components/recharts/theme.tsx so chips and charts agree.
  switch (group) {
    case CategoryType.NEEDS:
      return "bg-[#5b7a9d]/15 text-[#46627f]";
    case CategoryType.WANTS:
      return "bg-secondary-100 text-secondary-800";
    case CategoryType.INVESTMENT:
      return "bg-[#6c9a8b]/15 text-[#52796c]";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Parses an ISO date string and returns a local Date object to avoid timezone issues
 * @param dateString - ISO date string (e.g., "2024-01-15T00:00:00.000Z") or date string (e.g., "2024-01-15") or Date object
 * @returns Local Date object with the correct date, or null if invalid
 */
export function parseLocalDate(
  dateString: string | Date | null | undefined,
): Date | null {
  if (!dateString) return null;

  // If it's already a Date object, extract the date parts using local methods
  if (dateString instanceof Date) {
    return new Date(
      dateString.getFullYear(),
      dateString.getMonth(),
      dateString.getDate(),
    );
  }

  const dateStr = String(dateString);

  // Handle both ISO date strings and simple date strings
  let year: number, month: number, day: number;

  if (dateStr.includes("T")) {
    // ISO date string - extract date part
    const datePart = dateStr.split("T")[0] ?? "";
    [year, month, day] = datePart.split("-").map(Number) as [
      number,
      number,
      number,
    ];
  } else {
    // Simple date string (YYYY-MM-DD)
    [year, month, day] = dateStr.split("-").map(Number) as [
      number,
      number,
      number,
    ];
  }

  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day))
    return null;

  // Create local date to avoid timezone issues
  return new Date(year, month - 1, day);
}

export function formatDateUTC(date: string | Date): string {
  if (!date) return "";
  const dateString = typeof date === "string" ? date : date.toISOString();

  // Handle both ISO date strings and simple date strings
  let year: number, month: number, day: number;

  if (dateString.includes("T")) {
    // ISO date string - extract date part
    const datePart = dateString.split("T")[0] ?? "";
    [year, month, day] = datePart.split("-").map(Number) as [
      number,
      number,
      number,
    ];
  } else {
    // Simple date string (YYYY-MM-DD)
    [year, month, day] = dateString.split("-").map(Number) as [
      number,
      number,
      number,
    ];
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
      quarterlyEndDate.setDate(quarterlyEndDate.getDate() - 1);
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
