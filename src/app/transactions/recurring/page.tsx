"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  Repeat,
  Plus,
  Pause,
  Play,
  Pencil,
  Trash2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TransactionsPageNavigation from "@/components/transactions/TransactionsPageNavigation";
import RecurringTransactionForm from "@/components/transactions/RecurringTransactionForm";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import UpgradeModal from "@/components/UpgradeModal";
import FeatureDisabledState from "@/components/FeatureDisabledState";
import Button from "@/components/Button";
import { usePageLoading } from "@/components/ConditionalLayout";
import { useIsFeatureEnabled } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { useBillingStatus } from "@/lib/data-hooks/billing/useBilling";
import {
  useDeleteRecurringTransaction,
  useRecurringTransactions,
  useToggleRecurringTransactionPaused,
} from "@/lib/data-hooks/recurring/useRecurring";
import type { RecurringTransactionWithRelations } from "@/lib/types/recurring";
import { formatCurrency, getCategoryBadgeColor } from "@/lib/utils";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";

const RECURRING_UPGRADE_REASON =
  "Recurring transactions are a Premium feature. Upgrade to Premium to automate repeating transactions.";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  ONE_TIME: "One time",
};

const formatOccurrenceDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function RecurringTransactionsPage() {
  const recurringEnabled = useIsFeatureEnabled("recurringTransactions");
  const { data: templates = [], isLoading } = useRecurringTransactions();
  const { data: billingStatus } = useBillingStatus();
  const isPremium = billingStatus?.isPremium ?? false;

  const toggleMutation = useToggleRecurringTransactionPaused();
  const deleteMutation = useDeleteRecurringTransaction();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<RecurringTransactionWithRelations | null>(null);
  const [templateToDelete, setTemplateToDelete] =
    useState<RecurringTransactionWithRelations | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  usePageLoading(isLoading, "Loading recurring transactions...");

  if (!recurringEnabled) {
    return <FeatureDisabledState moduleLabel="Recurring transactions" />;
  }

  if (isLoading) {
    return null;
  }

  const requirePremium = (action: () => void) => {
    if (!isPremium) {
      setUpgradeReason(RECURRING_UPGRADE_REASON);
      return;
    }
    action();
  };

  const handleTogglePaused = (template: RecurringTransactionWithRelations) => {
    requirePremium(() => {
      toggleMutation.mutate(
        { id: template.id, paused: !template.paused },
        {
          onSuccess: () =>
            toast.success(template.paused ? "Resumed" : "Paused"),
          onError: (error: unknown) => {
            if (error instanceof UpgradeRequiredError) {
              setUpgradeReason(error.message);
              return;
            }
            toast.error("Failed to update recurring transaction.");
          },
        },
      );
    });
  };

  const handleEdit = (template: RecurringTransactionWithRelations) => {
    requirePremium(() => setEditingTemplate(template));
  };

  const handleDelete = (template: RecurringTransactionWithRelations) => {
    requirePremium(() => setTemplateToDelete(template));
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success("Recurring transaction deleted.");
      setTemplateToDelete(null);
    } catch (error) {
      if (error instanceof UpgradeRequiredError) {
        setTemplateToDelete(null);
        setUpgradeReason(error.message);
        return;
      }
      toast.error("Failed to delete recurring transaction.");
    }
  };

  return (
    <div className="flex flex-col bg-surface lg:h-screen">
      <PageHeader
        title="Recurring transactions"
        description="Rent, subscriptions, and paychecks that post automatically"
        action={{
          label: "New recurring",
          onClick: () => requirePremium(() => setShowForm(true)),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <TransactionsPageNavigation />

      <div className="pt-4 lg:flex-1 lg:overflow-hidden lg:pt-0">
        <div className="lg:h-full lg:overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 sm:pb-28 lg:px-8 lg:py-4 lg:pb-8">
            {!isPremium && (
              <div className="card-surface mb-4 flex items-center gap-3 p-4 sm:mb-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-700">
                  <Lock className="h-4 w-4" />
                </div>
                <p className="text-sm text-gray-600">
                  Recurring transactions are Premium. You can view any templates
                  below, but creating, editing, or pausing one requires
                  upgrading.
                </p>
              </div>
            )}

            <div className="card-surface overflow-hidden">
              {templates.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-3 py-12 text-center sm:px-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                    <Repeat className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                    No recurring transactions yet
                  </h3>
                  <p className="text-sm text-gray-500">
                    Automate rent, subscriptions, and paychecks so you never
                    have to enter them by hand.
                  </p>
                  <Button
                    onClick={() => requirePremium(() => setShowForm(true))}
                    variant="primary"
                    size="md"
                    className="mt-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New recurring transaction
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {template.name ?? "Unnamed recurring transaction"}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              template.category
                                ? getCategoryBadgeColor(template.category.group)
                                : getCategoryBadgeColor()
                            }`}
                          >
                            {template.category?.name ?? "No category"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {FREQUENCY_LABELS[template.frequency]}
                          </span>
                          {template.paused && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              Paused
                            </span>
                          )}
                          {template.needsBudget && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              Needs a budget
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {template.upcomingOccurrences.length > 0 ? (
                            <>
                              Next:{" "}
                              {template.upcomingOccurrences
                                .map(formatOccurrenceDate)
                                .join(" · ")}
                            </>
                          ) : (
                            "No upcoming occurrences"
                          )}
                          {template.endAt &&
                            ` · Ends ${formatOccurrenceDate(template.endAt)}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-sm font-semibold tabular-nums text-gray-900">
                          {formatCurrency(Math.abs(template.amount))}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleTogglePaused(template)}
                            disabled={toggleMutation.isPending}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                            title={template.paused ? "Resume" : "Pause"}
                            aria-label={
                              template.paused
                                ? "Resume recurring transaction"
                                : "Pause recurring transaction"
                            }
                          >
                            {template.paused ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(template)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                            title="Edit"
                            aria-label="Edit recurring transaction"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                            aria-label="Delete recurring transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <RecurringTransactionForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
      />

      <RecurringTransactionForm
        isOpen={!!editingTemplate}
        template={editingTemplate ?? undefined}
        onClose={() => setEditingTemplate(null)}
      />

      <DeleteConfirmationModal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete recurring transaction"
        message="Are you sure you want to delete '{itemName}'? Past posted transactions are kept; future occurrences will stop. This action cannot be undone."
        itemName={templateToDelete?.name ?? "Unnamed recurring transaction"}
        isLoading={deleteMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete"
        cancelText="Cancel"
      />

      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
      />
    </div>
  );
}
