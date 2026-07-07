import type { BudgetStatus, PeriodType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Pure, framework-agnostic date math for the recurring-transactions posting
// engine. Nothing here touches Prisma or the network — see
// `lib/api-services/recurring.ts` for the DB-backed posting job that calls
// into these helpers inside a `prisma.$transaction`.
// ---------------------------------------------------------------------------

/** Minimal shape of a recurring template needed for the date math below. */
export interface RecurringSchedule {
  frequency: PeriodType;
  nextRunAt: Date;
  endAt?: Date | null;
}

/**
 * Adds one period to `date` for the given frequency, using UTC field math so
 * the result is stable regardless of the host timezone (no DST skew).
 * `ONE_TIME` has no next occurrence — callers must never advance past a
 * ONE_TIME template's single firing (see `computeDueOccurrences`, which
 * never calls this for `ONE_TIME`).
 */
export const addPeriod = (date: Date, period: PeriodType): Date => {
  const next = new Date(date.getTime());
  switch (period) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case "QUARTERLY":
      next.setUTCMonth(next.getUTCMonth() + 3);
      return next;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
    case "ONE_TIME":
      throw new Error("ONE_TIME schedules have no next occurrence");
  }
};

export interface DueOccurrencesResult {
  /** Every occurrence date due to post, oldest first, catching up on any
   * periods missed since the schedule was last run. */
  occurrences: Date[];
  /**
   * Where `nextRunAt` should be advanced to after posting every occurrence
   * above. `null` means the schedule is exhausted — either a `ONE_TIME`
   * template just fired, or `endAt` has been passed — and the template
   * should be paused rather than rescheduled.
   */
  nextRunAt: Date | null;
}

/**
 * Computes every occurrence due between a template's stored `nextRunAt` and
 * `now` (inclusive), capped at `endAt` when set, plus the pointer `nextRunAt`
 * should advance to afterward.
 *
 * This is the whole idempotency contract for the posting engine: calling it
 * twice with the same `nextRunAt` and `now` always returns the same
 * occurrences, and once the caller persists the returned `nextRunAt` back
 * onto the template, a repeat call (e.g. a retried cron run) with the
 * now-advanced `nextRunAt` returns an empty `occurrences` list. No separate
 * "already posted" ledger is needed — the pointer IS the guard (the caller
 * additionally gets a uniqueness safeguard for free via the
 * `(recurringTransactionId, occurredAt)` unique index, in case two runs
 * somehow race before either persists its pointer update).
 *
 * `ONE_TIME` fires once (if due) and then reports `nextRunAt: null`.
 */
export const computeDueOccurrences = (
  schedule: RecurringSchedule,
  now: Date,
): DueOccurrencesResult => {
  const occurrences: Date[] = [];
  let cursor: Date | null = schedule.nextRunAt;

  while (cursor !== null && cursor.getTime() <= now.getTime()) {
    if (schedule.endAt && cursor.getTime() > schedule.endAt.getTime()) {
      cursor = null;
      break;
    }

    occurrences.push(cursor);
    cursor =
      schedule.frequency === "ONE_TIME"
        ? null
        : addPeriod(cursor, schedule.frequency);
  }

  // The pointer may have advanced past `endAt` without ever being <= `now`
  // (e.g. the last catch-up occurrence lands exactly on `endAt`, so the
  // period after it is already out of range) — cap it here too so a
  // schedule never lingers with a pointer that can never fire again.
  if (
    cursor !== null &&
    schedule.endAt &&
    cursor.getTime() > schedule.endAt.getTime()
  ) {
    cursor = null;
  }

  return { occurrences, nextRunAt: cursor };
};

/**
 * Previews up to `count` upcoming occurrence dates from a template's current
 * `nextRunAt`, without mutating anything — used by the management UI to show
 * "next 3 occurrences" style copy. Stops early at `endAt` when set.
 */
export const previewUpcomingOccurrences = (
  schedule: RecurringSchedule,
  count: number,
): Date[] => {
  if (
    schedule.endAt &&
    schedule.nextRunAt.getTime() > schedule.endAt.getTime()
  ) {
    return [];
  }

  if (schedule.frequency === "ONE_TIME") {
    return [schedule.nextRunAt];
  }

  const dates: Date[] = [];
  let cursor = schedule.nextRunAt;
  while (dates.length < count) {
    if (schedule.endAt && cursor.getTime() > schedule.endAt.getTime()) break;
    dates.push(cursor);
    cursor = addPeriod(cursor, schedule.frequency);
  }
  return dates;
};

/** Minimal shape of a budget needed to resolve which one an occurrence lands in. */
export interface BudgetWindow {
  id: string;
  status: BudgetStatus;
  startAt: Date;
  endAt: Date;
}

/**
 * Finds the ACTIVE budget whose `[startAt, endAt]` range contains
 * `occurrenceDate`, or `null` if none does — the "needs a budget" hold case.
 * When more than one active budget's range contains the date (shouldn't
 * normally happen, but budgets aren't required to be non-overlapping), the
 * one with the latest `startAt` wins, matching "the current period" intent.
 */
export const findBudgetForOccurrence = <B extends BudgetWindow>(
  occurrenceDate: Date,
  budgets: readonly B[],
): B | null => {
  const candidates = budgets.filter(
    (b) =>
      b.status === "ACTIVE" &&
      b.startAt.getTime() <= occurrenceDate.getTime() &&
      occurrenceDate.getTime() <= b.endAt.getTime(),
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((latest, candidate) =>
    candidate.startAt.getTime() > latest.startAt.getTime() ? candidate : latest,
  );
};
