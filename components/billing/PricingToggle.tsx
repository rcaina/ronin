"use client";

import type { BillingInterval } from "@/lib/data-hooks/services/billing";
import { BILLING_PRICING } from "@/lib/constants/billing";

interface PricingToggleProps {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
}

/** Shared monthly/annual pricing selector used by both `UpgradeModal` and
 * the settings Billing tab's inline upgrade section. */
export default function PricingToggle({
  interval,
  onChange,
  className = "",
}: PricingToggleProps) {
  const intervals = Object.keys(BILLING_PRICING) as BillingInterval[];

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {intervals.map((key) => {
        const plan = BILLING_PRICING[key];
        const isActive = interval === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`relative rounded-xl border p-3 text-left transition-all duration-200 ease-out ${
              isActive
                ? "border-secondary bg-secondary/10"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {plan.savingsLabel && (
              <span className="absolute -top-2 right-2 rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-semibold text-secondary-700">
                {plan.savingsLabel}
              </span>
            )}
            <p className="text-sm font-semibold text-gray-900">{plan.label}</p>
            <p className="text-xs text-gray-500">{plan.price}</p>
          </button>
        );
      })}
    </div>
  );
}
