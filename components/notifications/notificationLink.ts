import type {
  BudgetPeriodEndingData,
  CategoryOverThresholdData,
  SerializedNotification,
} from "@/lib/types/notification";

/**
 * Resolves the page a notification should navigate to when clicked, based on
 * its `type` + `data` payload (see the `evaluate*` functions in
 * lib/utils/notifications.ts for what `data` holds per type — `RecurringPostedData`
 * has no destination field of its own, since it always routes to the same
 * page). Returns `null` for a type with no natural destination.
 */
export const getNotificationLink = (
  notification: Pick<SerializedNotification, "type" | "data">,
): string | null => {
  switch (notification.type) {
    case "CATEGORY_OVER_THRESHOLD": {
      const data = notification.data as CategoryOverThresholdData | null;
      return data?.budgetId ? `/budgets/${data.budgetId}/categories` : null;
    }
    case "BUDGET_PERIOD_ENDING": {
      const data = notification.data as BudgetPeriodEndingData | null;
      return data?.budgetId ? `/budgets/${data.budgetId}` : null;
    }
    case "RECURRING_POSTED":
      return "/transactions/recurring";
    default:
      return null;
  }
};
