"use client";

import { Suspense, useEffect, useState, useMemo, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Target,
  Archive,
  RotateCcw,
  Trash2,
  Plus,
  CheckCircle,
  Lock,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useActiveBudgets,
  useCompletedBudgets,
  useArchivedBudgets,
  useMarkBudgetCompleted,
  useMarkBudgetArchived,
  useReactivateBudget,
  useGetOrCreateContinuousBudget,
} from "@/lib/data-hooks/budgets/useBudgets";
import { useDeleteBudget } from "@/lib/data-hooks/budgets/useBudgets";
import type { BudgetWithRelations } from "@/lib/types/budget";
import PageHeader from "@/components/PageHeader";
import { usePageLoading } from "@/components/ConditionalLayout";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import UpgradeModal from "@/components/UpgradeModal";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";
import { CategoryType } from "@prisma/client";
import Button from "@/components/Button";
import Tabs, { tabPanelProps } from "@/components/Tabs";
import { formatCurrency, pressable, roundToCents } from "@/lib/utils";
import {
  calculateBudgetSpent,
  calculateSpendingPercentage,
  calculateTotalIncome,
} from "@/lib/utils/spending";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { formatMonthLabel, toMonthKey } from "@/lib/utils/budget-month";

type TabType = "active" | "completed" | "archived";

const BudgetsPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [budgetToDelete, setBudgetToDelete] =
    useState<BudgetWithRelations | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    () => searchParams.get("new") === "event",
  );

  // Drop ?new=event once read so refresh and back don't reopen the wizard.
  useEffect(() => {
    if (searchParams.has("new")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  // Data hooks for different budget statuses (excluding card payments for calculations)
  const {
    data: activeBudgetsData,
    isLoading: activeLoading,
    error: activeError,
    refetch: refetchActive,
  } = useActiveBudgets(true);
  const { data: completedBudgetsData, isLoading: completedLoading } =
    useCompletedBudgets(true);
  const { data: archivedBudgetsData, isLoading: archivedLoading } =
    useArchivedBudgets(true);

  // Ensure budgets are always arrays (memoized to avoid unnecessary re-renders)
  const allActiveBudgets = useMemo(
    () => (Array.isArray(activeBudgetsData) ? activeBudgetsData : []),
    [activeBudgetsData],
  );
  // The monthly budget is pinned above the tabs, so the tabs list the rest.
  const continuousBudget = allActiveBudgets.find(
    (budget) => budget.kind === "CONTINUOUS",
  );
  const thisMonth = toMonthKey(new Date());
  const {
    data: monthBudget,
    isLoading: monthLoading,
    error: monthError,
    refetch: refetchMonth,
  } = useBudget(continuousBudget?.id ?? "", true, thisMonth);
  const activeBudgets = useMemo(
    () => allActiveBudgets.filter((budget) => budget.kind !== "CONTINUOUS"),
    [allActiveBudgets],
  );
  const completedBudgets = useMemo(
    () => (Array.isArray(completedBudgetsData) ? completedBudgetsData : []),
    [completedBudgetsData],
  );
  const archivedBudgets = useMemo(
    () => (Array.isArray(archivedBudgetsData) ? archivedBudgetsData : []),
    [archivedBudgetsData],
  );

  // Mutation hooks
  const deleteBudgetMutation = useDeleteBudget();
  const markCompletedMutation = useMarkBudgetCompleted();
  const markArchivedMutation = useMarkBudgetArchived();
  const reactivateMutation = useReactivateBudget();
  const continuousBudgetMutation = useGetOrCreateContinuousBudget();

  const handleOpenMonthlyBudget = async () => {
    try {
      const budget = await continuousBudgetMutation.mutateAsync();
      router.push(`/budgets/${budget.id}`);
    } catch (error) {
      console.error("Failed to start monthly budget:", error);
      toast.error("Couldn't start your monthly budget. Please try again.");
    }
  };

  // Get current budgets based on active tab, sorted by which budget ends soonest (completed: newest period first)
  const currentBudgets = useMemo(() => {
    const budgets = (() => {
      switch (activeTab) {
        case "active":
          return activeBudgets;
        case "completed":
          return completedBudgets;
        case "archived":
          return archivedBudgets;
        default:
          return activeBudgets;
      }
    })();

    // Completed budgets are history: newest period first
    if (activeTab === "completed") {
      return [...budgets].sort(
        (a, b) =>
          new Date(b.startAt).getTime() - new Date(a.startAt).getTime() ||
          new Date(b.endAt ?? 0).getTime() - new Date(a.endAt ?? 0).getTime(),
      );
    }

    return [...budgets].sort(
      (a, b) =>
        new Date(a.endAt ?? 0).getTime() - new Date(b.endAt ?? 0).getTime(),
    );
  }, [activeTab, activeBudgets, completedBudgets, archivedBudgets]);

  const isLoading =
    activeLoading || completedLoading || archivedLoading || monthLoading;

  const monthPlanned = roundToCents(
    (monthBudget?.categories ?? []).reduce(
      (sum, category) => sum + (category.allocatedAmount ?? 0),
      0,
    ),
  );
  const monthSpent = roundToCents(
    monthBudget ? calculateBudgetSpent(monthBudget) : 0,
  );
  const monthRemaining = roundToCents(monthPlanned - monthSpent);
  const monthPercent = calculateSpendingPercentage(monthSpent, monthPlanned);

  usePageLoading(isLoading, "Loading budgets...");
  if (isLoading) {
    return null;
  }

  // Without this, a failed load reads as "no monthly budget" or a $0 month.
  if ((activeError && !activeBudgetsData) || (monthError && !monthBudget)) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Failed to load budgets</p>
        <Button
          variant="outline"
          className="mt-3 min-h-11"
          onClick={() => {
            void refetchActive();
            if (continuousBudget) void refetchMonth();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const getBudgetStatus = (budget: BudgetWithRelations) => {
    const totalBudgetIncome = calculateTotalIncome(budget);
    const totalBudgetSpent = roundToCents(calculateBudgetSpent(budget));

    const percentage = roundToCents(
      calculateSpendingPercentage(totalBudgetSpent, totalBudgetIncome),
    );

    if (percentage > 100)
      return {
        label: "Over budget",
        chip: "bg-red-50 text-red-700",
        bar: "bg-red-500",
      };
    if (percentage < 100)
      return {
        label: "In progress",
        chip: "bg-secondary-100 text-secondary-800",
        bar: "bg-secondary",
      };
    return {
      label: "Complete",
      chip: "bg-green-50 text-green-700",
      bar: "bg-green-500",
    };
  };

  const getCategorySummary = (budget: BudgetWithRelations) => {
    const categories = budget.categories ?? [];
    const needs = categories.filter(
      (cat) => cat.group === CategoryType.NEEDS,
    ).length;
    const wants = categories.filter(
      (cat) => cat.group === CategoryType.WANTS,
    ).length;
    const investments = categories.filter(
      (cat) => cat.group === CategoryType.INVESTMENT,
    ).length;

    return { needs, wants, investments };
  };

  const handleDeleteBudget = (budget: BudgetWithRelations) => {
    setBudgetToDelete(budget);
  };

  const handleMarkCompleted = async (budget: BudgetWithRelations) => {
    try {
      await markCompletedMutation.mutateAsync(budget.id);
      toast.success("Event marked as completed");
    } catch (err) {
      toast.error("Failed to mark event as completed. Please try again.");
      console.error("Failed to mark budget as completed:", err);
    }
  };

  const handleMarkArchived = async (budget: BudgetWithRelations) => {
    try {
      await markArchivedMutation.mutateAsync(budget.id);
      toast.success("Event archived");
    } catch (err) {
      toast.error("Failed to archive event. Please try again.");
      console.error("Failed to archive budget:", err);
    }
  };

  const handleReactivate = async (budget: BudgetWithRelations) => {
    try {
      await reactivateMutation.mutateAsync(budget.id);
      toast.success("Event reactivated");
    } catch (err) {
      if (err instanceof UpgradeRequiredError) {
        setUpgradeReason(err.message);
        return;
      }
      toast.error("Failed to reactivate event. Please try again.");
      console.error("Failed to reactivate budget:", err);
    }
  };

  const tabs = [
    { id: "active" as TabType, label: "Active", count: activeBudgets.length },
    {
      id: "completed" as TabType,
      label: "Completed",
      count: completedBudgets.length,
    },
    {
      id: "archived" as TabType,
      label: "Archived",
      count: archivedBudgets.length,
    },
  ];

  return (
    <div className="flex flex-col bg-surface pt-4 lg:h-screen lg:pt-0">
      <PageHeader
        title="Budgets"
        description="Your monthly budget and events"
        action={{
          icon: <Plus className="h-4 w-4" />,
          label: "New event",
          onClick: () => setIsCreateModalOpen(true),
        }}
      />

      <div className="lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-3">
            {continuousBudget ? (
              <button
                type="button"
                onClick={() => router.push(`/budgets/${continuousBudget.id}`)}
                className="card-interactive w-full p-4 text-left sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary-700">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {continuousBudget.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatMonthLabel(thisMonth)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${
                      monthRemaining < 0
                        ? "bg-red-500"
                        : monthPercent === 100
                          ? "bg-green-500"
                          : "bg-secondary"
                    }`}
                    style={{
                      width: `${monthRemaining < 0 ? 100 : Math.min(monthPercent, 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-surface px-2 py-3 text-center">
                  <div>
                    <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                      {formatCurrency(monthPlanned)}
                    </div>
                    <div className="text-xs text-gray-500">Planned</div>
                  </div>
                  <div>
                    <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                      {formatCurrency(monthSpent)}
                    </div>
                    <div className="text-xs text-gray-500">Spent</div>
                  </div>
                  <div>
                    <div
                      className={`text-base font-bold tabular-nums tracking-tight sm:text-lg ${
                        monthRemaining >= 0 ? "text-gray-900" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(monthRemaining))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {monthRemaining >= 0 ? "Remaining" : "Over plan"}
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <div className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-gray-500">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Start your monthly budget
                  </p>
                  <p className="text-xs text-gray-500">
                    One budget that carries on month to month. Plan each month
                    and see what&apos;s left.
                  </p>
                </div>
                <Button
                  onClick={handleOpenMonthlyBudget}
                  isLoading={continuousBudgetMutation.isPending}
                  className="min-h-11"
                >
                  Start monthly budget
                </Button>
              </div>
            )}
          </div>

          <h2 className="mb-2 mt-6 text-base font-semibold text-gray-900">
            Events
          </h2>
          <div className="mb-1 flex-shrink-0">
            <Tabs
              ariaLabel="Budget status"
              items={tabs}
              value={activeTab}
              onChange={setActiveTab}
              panelId="budget-status-panel"
            />
          </div>
        </div>

        {/* Budgets List */}
        <div
          {...tabPanelProps("budget-status-panel", activeTab)}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
        >
          <div className="mx-auto w-full px-4 py-3 pb-28 sm:px-6 lg:px-8 lg:pb-8">
            <div className="grid gap-4 xl:grid-cols-2">
              {currentBudgets.length === 0 ? (
                <div className="card-surface col-span-full flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                    <Target className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    No {activeTab} events
                  </h3>
                  {activeTab === "active" && (
                    <>
                      <p className="text-sm text-gray-500">
                        Budget a trip, a move or anything with an end date.
                      </p>
                      <Button onClick={() => setIsCreateModalOpen(true)}>
                        New event
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                currentBudgets?.map((budget: BudgetWithRelations) => {
                  const budgetStatus = getBudgetStatus(budget);
                  const categorySummary = getCategorySummary(budget);
                  const totalBudgetIncome = calculateTotalIncome(budget);
                  const totalBudgetSpent = calculateBudgetSpent(budget);
                  const budgetRemaining = totalBudgetIncome - totalBudgetSpent;
                  const spendingPercentage = calculateSpendingPercentage(
                    totalBudgetSpent,
                    totalBudgetIncome,
                  );

                  // Calculate days remaining in budget period
                  const now = new Date();
                  const endDate = new Date(budget.endAt ?? 0);
                  const daysRemaining = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  const isOverdue = daysRemaining < 0;

                  const statusChip =
                    activeTab === "completed"
                      ? {
                          label: "Completed",
                          chip: "bg-green-50 text-green-700",
                        }
                      : activeTab === "archived"
                        ? {
                            label: "Archived",
                            chip: "bg-gray-100 text-gray-600",
                          }
                        : {
                            label: budgetStatus.label,
                            chip: budgetStatus.chip,
                          };

                  // Locked active budgets (older budgets an over-limit free
                  // account can no longer access after a downgrade) are
                  // hard-blocked: clicking opens the upgrade paywall instead of
                  // navigating, and the card reads as visibly blocked.
                  const isLocked = activeTab === "active" && budget.locked;

                  return (
                    <div
                      key={budget.id}
                      className={
                        isLocked
                          ? "card-surface cursor-not-allowed p-5 opacity-60 sm:p-6"
                          : "card-interactive cursor-pointer p-5 sm:p-6"
                      }
                      {...pressable(() =>
                        isLocked
                          ? setUpgradeReason(
                              "This budget is locked. Upgrade to Premium to access it.",
                            )
                          : router.push(`/budgets/${budget.id}`),
                      )}
                    >
                      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
                              {budget.name}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChip.chip}`}
                            >
                              {statusChip.label}
                            </span>
                            {/* Locked budgets (hard-blocked after a downgrade
                              past the free active-budget limit) can't be
                              opened — clicking the card opens the upgrade
                              paywall instead. Flag them clearly here. */}
                            {isLocked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary-700">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                            )}
                            {/* Action Icons */}
                            <div className="ml-auto flex items-center gap-0.5">
                              {activeTab === "active" && (
                                <>
                                  <button
                                    onClick={async (e: MouseEvent) => {
                                      e.stopPropagation();
                                      await handleMarkCompleted(budget);
                                    }}
                                    className="tap-target rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-green-50 hover:text-green-600"
                                    title="Mark as completed"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={async (e: MouseEvent) => {
                                      e.stopPropagation();
                                      await handleMarkArchived(budget);
                                    }}
                                    className="tap-target rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-secondary-50 hover:text-secondary-700"
                                    title="Archive"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {(activeTab === "completed" ||
                                activeTab === "archived") && (
                                <button
                                  onClick={async (e: MouseEvent) => {
                                    e.stopPropagation();
                                    await handleReactivate(budget);
                                  }}
                                  className="tap-target rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-secondary-50 hover:text-secondary-700"
                                  title="Reactivate"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  handleDeleteBudget(budget);
                                }}
                                className="tap-target rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4 sm:text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="capitalize">
                                {budget.period.replace("_", " ").toLowerCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-3.5 w-3.5" />
                              <span className="capitalize">
                                {budget.strategy
                                  .replace("_", " ")
                                  .toLowerCase()}
                              </span>
                            </div>
                            {activeTab === "active" && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span
                                  className={
                                    isOverdue ? "font-medium text-red-600" : ""
                                  }
                                >
                                  {isOverdue
                                    ? `${Math.abs(daysRemaining)} days overdue`
                                    : `${daysRemaining} days left`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-2xl">
                            {formatCurrency(totalBudgetIncome)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total budget
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">
                            Progress
                          </span>
                          <span className="text-xs font-medium tabular-nums text-gray-500">
                            {spendingPercentage.toFixed(1)}% used
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ease-out ${
                              spendingPercentage === 100
                                ? "bg-green-500"
                                : spendingPercentage > 100
                                  ? "bg-red-500"
                                  : "bg-secondary"
                            }`}
                            style={{
                              width: `${Math.min(spendingPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Budget Summary */}
                      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-surface px-2 py-3 text-center">
                        <div>
                          <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                            {formatCurrency(totalBudgetSpent)}
                          </div>
                          <div className="text-xs text-gray-500">Spent</div>
                        </div>
                        <div>
                          <div
                            className={`text-base font-bold tabular-nums tracking-tight sm:text-lg ${
                              budgetRemaining >= 0
                                ? "text-gray-900"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(Math.abs(budgetRemaining))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {budgetRemaining >= 0 ? "Remaining" : "Over budget"}
                          </div>
                        </div>
                        <div>
                          <div className="text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
                            {categorySummary.needs +
                              categorySummary.wants +
                              categorySummary.investments}
                          </div>
                          <div className="text-xs text-gray-500">
                            Categories
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(result) => {
          setIsCreateModalOpen(false);
          // Quick-created budgets skip the later steps, so open the new budget
          // for the user to fill in income, cards and categories.
          if (result.quickCreate) {
            router.push(`/budgets/${result.budgetId}`);
          }
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={async () => {
          if (budgetToDelete) {
            try {
              await deleteBudgetMutation.mutateAsync(budgetToDelete.id);
              toast.success("Event deleted");
              setBudgetToDelete(null);
            } catch (err) {
              toast.error("Failed to delete event. Please try again.");
              console.error("Failed to delete budget:", err);
            }
          }
        }}
        title="Delete event"
        message={`Are you sure you want to delete "${budgetToDelete?.name}"? This action cannot be undone.`}
        itemName={budgetToDelete?.name ?? ""}
      />

      {/* Upgrade paywall (free tier is limited to one active budget) */}
      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
      />
    </div>
  );
};

const BudgetsPage = () => (
  <Suspense fallback={null}>
    <BudgetsPageContent />
  </Suspense>
);

export default BudgetsPage;
