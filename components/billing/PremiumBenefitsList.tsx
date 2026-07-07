import { Check } from "lucide-react";
import { PREMIUM_BENEFITS } from "@/lib/constants/billing";

/** Shared Premium benefit bullet list used by both `UpgradeModal` and the
 * settings Billing tab's inline upgrade section. */
export default function PremiumBenefitsList({
  className = "",
}: {
  className?: string;
}) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {PREMIUM_BENEFITS.map((benefit) => (
        <li
          key={benefit}
          className="flex items-center gap-2 text-sm text-gray-700"
        >
          <Check className="h-4 w-4 shrink-0 text-secondary-600" />
          {benefit}
        </li>
      ))}
    </ul>
  );
}
