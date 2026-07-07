import Link from "next/link";
import { PowerOff } from "lucide-react";
import Button from "./Button";

interface FeatureDisabledStateProps {
  /** Module name shown in the headline, e.g. "Savings". */
  moduleLabel: string;
}

/**
 * Shown when a user navigates directly to a module's route while it's
 * turned off for the account (e.g. `/savings`, `/cards`). Never 404s —
 * shared budgets may hold historical data for a module that's since been
 * disabled, so the route must stay reachable, just not usable.
 */
export default function FeatureDisabledState({
  moduleLabel,
}: FeatureDisabledStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="card-surface flex max-w-sm flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
          <PowerOff className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {moduleLabel} is turned off
        </h3>
        <p className="text-sm text-gray-500">
          This feature is turned off for your household. Your data is kept — an
          account admin can turn it back on in settings.
        </p>
        <Link href="/settings?tab=features">
          <Button variant="outline">Go to settings</Button>
        </Link>
      </div>
    </div>
  );
}
