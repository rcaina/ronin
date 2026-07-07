import type { Notification } from "@prisma/client";

/** A `Notification` row as returned by the API — dates serialized to ISO
 * strings via `NextResponse.json`, matching the pattern in `lib/types/budget.ts`. */
export type SerializedNotification = Omit<
  Notification,
  "createdAt" | "readAt" | "deleted"
> & {
  createdAt: string;
  readAt: string | null;
  deleted: string | null;
};

export interface NotificationListResponse {
  notifications: SerializedNotification[];
  unreadCount: number;
}

/** Shape of `Notification.data` for each trigger type, as populated by the
 * `evaluate*` functions in `lib/utils/notifications.ts` — used by the bell
 * dropdown to route a click to the right page. */
export interface CategoryOverThresholdData {
  categoryId: string;
  budgetId: string;
}

export interface BudgetPeriodEndingData {
  budgetId: string;
}

export interface RecurringPostedData {
  recurringTransactionId: string;
  occurredAt: string;
}
