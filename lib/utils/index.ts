import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PeriodType } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    return amount;
  }

  // Handle ONE_TIME income - it's a one-time payment regardless of budget period
  if (incomeFrequency === PeriodType.ONE_TIME) {
    return amount;
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
    return (amount / incomeWeeks) * budgetWeeks;
  }

  // If income frequency is shorter than budget period, calculate how many times it occurs
  // Round up to ensure users get the full amount for partial periods
  const multiplier = budgetWeeks / incomeWeeks;
  return Math.ceil(multiplier) * amount;
} 