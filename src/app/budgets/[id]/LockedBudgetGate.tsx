"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import Button from "@/components/Button";
import UpgradeModal from "@/components/UpgradeModal";

// Full-screen gate shown in place of a locked budget's detail views (see the
// budgets/[id] pages). A budget becomes locked when the account downgrades
// past the free-tier active-budget limit — it is then hard-blocked (no budget
// content renders) until the user upgrades or gets back under the limit by
// self-remediating from the budgets list. Keep this copy in sync with the
// premium/upgrade wording used elsewhere.
const LOCKED_BUDGET_REASON =
  "This budget is locked. Upgrade to Premium to access it.";

export default function LockedBudgetGate() {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="card-surface flex w-full max-w-md animate-fade-in-up flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15 text-secondary-700">
          <Lock className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            This budget is locked
          </h2>
          <p className="text-sm text-gray-500">
            Upgrade to Premium to access this budget.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowUpgrade(true)}>
          Upgrade to Premium
        </Button>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={LOCKED_BUDGET_REASON}
      />
    </div>
  );
}
