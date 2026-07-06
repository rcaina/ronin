import type { BillingInterval } from "@/lib/data-hooks/services/billing";

/** Premium benefit copy shared between `UpgradeModal` and the settings
 * Billing tab's inline upgrade section — keep this the single source of
 * truth so the two surfaces can't drift. */
export const PREMIUM_BENEFITS = [
  "Unlimited active budgets",
  "Unlimited household members",
  "AI receipt scanning",
  "Unlimited savings pockets",
] as const;

/** Display copy for each billing interval, keyed the same way the checkout
 * API expects (`{ interval: "month" | "year" }`). Single source of truth for
 * the prices shown across the paywall modal and settings billing tab. */
export const BILLING_PRICING: Record<
  BillingInterval,
  { label: string; price: string; savingsLabel?: string }
> = {
  month: { label: "Monthly", price: "$5/month" },
  year: { label: "Annual", price: "$45/year", savingsLabel: "Save 25%" },
};
