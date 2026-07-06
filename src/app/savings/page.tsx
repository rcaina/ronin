"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import FeatureDisabledState from "@/components/FeatureDisabledState";
import { useIsFeatureEnabled } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { useSavings } from "@/lib/data-hooks/savings/useSavings";
import { usePageLoading } from "@/components/ConditionalLayout";
import StatsCard from "@/components/StatsCard";
import { DollarSign, PiggyBank, Plus, Target, Wallet } from "lucide-react";
import CreateSavingsModal from "@/components/savings/CreateSavingsModal";
import Button from "@/components/Button";
import { formatCurrency, roundToCents } from "@/lib/utils";

export default function SavingsPage() {
  const savingsEnabled = useIsFeatureEnabled("savings");
  const { data: savings = [], isLoading, error } = useSavings();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreate = () => setIsCreateModalOpen(true);

  usePageLoading(isLoading, "Loading savings...");
  if (isLoading) return null;
  if (!savingsEnabled) return <FeatureDisabledState moduleLabel="Savings" />;
  if (error)
    return <div className="p-6 text-red-600">Failed to load savings</div>;

  // Aggregate stats across all accounts
  const totalSaved = roundToCents(
    savings.reduce((sum, acc) => sum + acc.total, 0),
  );
  const totalPockets = savings.reduce(
    (sum, acc) => sum + acc.pockets.length,
    0,
  );
  const allPockets = savings.flatMap((acc) => acc.pockets);
  const pocketsWithGoals = allPockets.filter(
    (p) => typeof p.goalAmount === "number" && p.goalAmount > 0,
  );
  const goalsReached = pocketsWithGoals.filter(
    (p) => p.total >= (p.goalAmount ?? 0),
  ).length;

  // Per-account goal progress (only counts pockets with a goal set)
  const getAccountGoalProgress = (account: (typeof savings)[number]) => {
    const goalPockets = account.pockets.filter(
      (p) => typeof p.goalAmount === "number" && p.goalAmount > 0,
    );
    const goal = goalPockets.reduce((sum, p) => sum + (p.goalAmount ?? 0), 0);
    if (goal <= 0) return null;
    const saved = goalPockets.reduce((sum, p) => sum + p.total, 0);
    return { percentage: roundToCents((saved / goal) * 100) };
  };

  return (
    <div className="flex flex-col bg-surface pt-4 lg:h-screen lg:pt-0">
      <PageHeader
        title="Savings"
        description="Track savings accounts and categories"
        action={{
          label: "Add savings account",
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />,
        }}
      />
      <CreateSavingsModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <div className="lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
          {savings.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              <StatsCard
                title="Total saved"
                value={formatCurrency(totalSaved)}
                subtitle="Across all accounts"
                icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
                iconColor="text-green-600"
                valueColor="text-green-600"
              />
              <StatsCard
                title="Accounts"
                value={savings.length}
                subtitle="Savings accounts"
                icon={<PiggyBank className="h-4 w-4 sm:h-5 sm:w-5" />}
                iconColor="text-secondary-600"
              />
              <StatsCard
                title="Pockets"
                value={totalPockets}
                subtitle="Across all accounts"
                icon={<Wallet className="h-4 w-4 sm:h-5 sm:w-5" />}
                iconColor="text-secondary-600"
              />
              {pocketsWithGoals.length > 0 && (
                <StatsCard
                  title="Goals reached"
                  value={`${goalsReached}/${pocketsWithGoals.length}`}
                  subtitle="Pockets at their goal"
                  icon={<Target className="h-4 w-4 sm:h-5 sm:w-5" />}
                  iconColor="text-secondary-600"
                  valueColor={
                    goalsReached === pocketsWithGoals.length
                      ? "text-green-600"
                      : "text-gray-900"
                  }
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {savings.map((acc) => {
              const goalProgress = getAccountGoalProgress(acc);

              return (
                <Link
                  key={acc.id}
                  href={`/savings/${acc.id}`}
                  className="card-interactive block p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-muted text-secondary-600">
                      <PiggyBank className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-gray-900">
                      {acc.name}
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-2">
                    <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium tabular-nums text-secondary-700">
                      {acc.pockets.length}{" "}
                      {acc.pockets.length === 1 ? "pocket" : "pockets"}
                    </span>
                    <span className="text-lg font-bold tabular-nums tracking-tight text-gray-900">
                      {formatCurrency(acc.total)}
                    </span>
                  </div>
                  {goalProgress && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Goal progress
                        </span>
                        <span className="text-xs font-medium tabular-nums text-gray-500">
                          {goalProgress.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            goalProgress.percentage >= 100
                              ? "bg-green-500"
                              : "bg-secondary"
                          }`}
                          style={{
                            width: `${Math.min(goalProgress.percentage, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          {savings.length === 0 && (
            <div className="card-surface flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                <PiggyBank className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                No savings accounts yet
              </h3>
              <p className="text-sm text-gray-500">
                Create your first savings account to start tracking your goals
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                <span>Add savings account</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
