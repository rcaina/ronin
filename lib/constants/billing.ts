import type { BillingInterval } from "@/lib/data-hooks/services/billing";

/** Premium benefit copy shared between `UpgradeModal` and the settings
 * Billing tab's inline upgrade section — keep this the single source of
 * truth so the two surfaces can't drift. */
export const PREMIUM_BENEFITS = [
  "Unlimited active budgets",
  "Unlimited household members",
  "AI receipt scanning",
  "Unlimited savings pockets",
  "Split transactions across categories",
] as const;

/** Display copy for each billing interval, keyed the same way the checkout
 * API expects (`{ interval: "month" | "year" }`). Single source of truth for
 * the prices shown across the paywall modal and settings billing tab.
 *
 * `amount` / `cadence` render the large headline price on the plan card;
 * `billedAs` is the smaller reassurance line beneath it; `price` is the
 * compact one-liner used by the `PricingToggle` options. */
export const BILLING_PRICING: Record<
  BillingInterval,
  {
    label: string;
    price: string;
    amount: string;
    cadence: string;
    billedAs: string;
    savingsLabel?: string;
  }
> = {
  month: {
    label: "Monthly",
    price: "$4.99/month",
    amount: "$4.99",
    cadence: "/mo",
    billedAs: "Billed monthly",
  },
  year: {
    label: "Annual",
    price: "$44.99/year",
    amount: "$3.75",
    cadence: "/mo",
    billedAs: "$44.99 billed annually",
    savingsLabel: "Save 25%",
  },
};
