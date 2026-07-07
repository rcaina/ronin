import { describe, expect, it } from "vitest";
import {
  addPeriod,
  computeDueOccurrences,
  findBudgetForOccurrence,
  previewUpcomingOccurrences,
  type BudgetWindow,
} from "@/lib/utils/recurring";

const d = (iso: string): Date => new Date(iso);

describe("addPeriod", () => {
  it("adds a day for DAILY", () => {
    expect(addPeriod(d("2026-01-01T00:00:00.000Z"), "DAILY")).toEqual(
      d("2026-01-02T00:00:00.000Z"),
    );
  });

  it("adds seven days for WEEKLY", () => {
    expect(addPeriod(d("2026-01-01T00:00:00.000Z"), "WEEKLY")).toEqual(
      d("2026-01-08T00:00:00.000Z"),
    );
  });

  it("adds a month for MONTHLY, rolling over year boundaries", () => {
    expect(addPeriod(d("2026-12-15T00:00:00.000Z"), "MONTHLY")).toEqual(
      d("2027-01-15T00:00:00.000Z"),
    );
  });

  it("adds three months for QUARTERLY", () => {
    expect(addPeriod(d("2026-01-31T00:00:00.000Z"), "QUARTERLY")).toEqual(
      // JS Date rolls Jan 31 + 3 months into May 1 (Apr has 30 days) — this
      // is the accepted (and documented) behavior of UTC field math.
      d("2026-05-01T00:00:00.000Z"),
    );
  });

  it("adds a year for YEARLY", () => {
    expect(addPeriod(d("2026-03-10T00:00:00.000Z"), "YEARLY")).toEqual(
      d("2027-03-10T00:00:00.000Z"),
    );
  });

  it("throws for ONE_TIME", () => {
    expect(() =>
      addPeriod(d("2026-01-01T00:00:00.000Z"), "ONE_TIME"),
    ).toThrow();
  });
});

describe("computeDueOccurrences", () => {
  it("returns nothing when nextRunAt is still in the future", () => {
    const result = computeDueOccurrences(
      { frequency: "MONTHLY", nextRunAt: d("2026-12-01"), endAt: null },
      d("2026-06-01"),
    );
    expect(result.occurrences).toEqual([]);
    expect(result.nextRunAt).toEqual(d("2026-12-01"));
  });

  it("returns a single occurrence when exactly one period is due", () => {
    const result = computeDueOccurrences(
      { frequency: "MONTHLY", nextRunAt: d("2026-01-01"), endAt: null },
      d("2026-01-01"),
    );
    expect(result.occurrences).toEqual([d("2026-01-01")]);
    expect(result.nextRunAt).toEqual(d("2026-02-01"));
  });

  it("catches up on multiple missed periods", () => {
    const result = computeDueOccurrences(
      { frequency: "MONTHLY", nextRunAt: d("2026-01-01"), endAt: null },
      d("2026-04-15"),
    );
    expect(result.occurrences).toEqual([
      d("2026-01-01"),
      d("2026-02-01"),
      d("2026-03-01"),
      d("2026-04-01"),
    ]);
    expect(result.nextRunAt).toEqual(d("2026-05-01"));
  });

  it("is idempotent — re-running with the advanced pointer yields nothing new", () => {
    const now = d("2026-04-15");
    const first = computeDueOccurrences(
      { frequency: "MONTHLY", nextRunAt: d("2026-01-01"), endAt: null },
      now,
    );
    const second = computeDueOccurrences(
      { frequency: "MONTHLY", nextRunAt: first.nextRunAt!, endAt: null },
      now,
    );
    expect(second.occurrences).toEqual([]);
    expect(second.nextRunAt).toEqual(first.nextRunAt);
  });

  it("caps catch-up at endAt and exhausts the schedule", () => {
    const result = computeDueOccurrences(
      {
        frequency: "MONTHLY",
        nextRunAt: d("2026-01-01"),
        endAt: d("2026-02-15"),
      },
      d("2026-04-01"),
    );
    expect(result.occurrences).toEqual([d("2026-01-01"), d("2026-02-01")]);
    expect(result.nextRunAt).toBeNull();
  });

  it("does not include an occurrence landing after endAt", () => {
    const result = computeDueOccurrences(
      {
        frequency: "WEEKLY",
        nextRunAt: d("2026-01-01"),
        endAt: d("2026-01-01"),
      },
      d("2026-02-01"),
    );
    expect(result.occurrences).toEqual([d("2026-01-01")]);
    expect(result.nextRunAt).toBeNull();
  });

  it("fires ONE_TIME once when due and reports the schedule exhausted", () => {
    const result = computeDueOccurrences(
      { frequency: "ONE_TIME", nextRunAt: d("2026-01-01"), endAt: null },
      d("2026-03-01"),
    );
    expect(result.occurrences).toEqual([d("2026-01-01")]);
    expect(result.nextRunAt).toBeNull();
  });

  it("does not fire ONE_TIME before its date", () => {
    const result = computeDueOccurrences(
      { frequency: "ONE_TIME", nextRunAt: d("2026-06-01"), endAt: null },
      d("2026-01-01"),
    );
    expect(result.occurrences).toEqual([]);
    expect(result.nextRunAt).toEqual(d("2026-06-01"));
  });

  it("handles DAILY catch-up across many missed days", () => {
    const result = computeDueOccurrences(
      { frequency: "DAILY", nextRunAt: d("2026-01-01"), endAt: null },
      d("2026-01-05"),
    );
    expect(result.occurrences).toHaveLength(5);
    expect(result.nextRunAt).toEqual(d("2026-01-06"));
  });
});

describe("previewUpcomingOccurrences", () => {
  it("returns the next N occurrences without mutating the schedule", () => {
    const schedule = {
      frequency: "MONTHLY" as const,
      nextRunAt: d("2026-01-01"),
      endAt: null,
    };
    const preview = previewUpcomingOccurrences(schedule, 3);
    expect(preview).toEqual([
      d("2026-01-01"),
      d("2026-02-01"),
      d("2026-03-01"),
    ]);
    // Unmutated.
    expect(schedule.nextRunAt).toEqual(d("2026-01-01"));
  });

  it("stops early at endAt", () => {
    const preview = previewUpcomingOccurrences(
      {
        frequency: "MONTHLY",
        nextRunAt: d("2026-01-01"),
        endAt: d("2026-02-15"),
      },
      5,
    );
    expect(preview).toEqual([d("2026-01-01"), d("2026-02-01")]);
  });

  it("returns empty when nextRunAt is already past endAt", () => {
    const preview = previewUpcomingOccurrences(
      {
        frequency: "MONTHLY",
        nextRunAt: d("2026-03-01"),
        endAt: d("2026-02-01"),
      },
      5,
    );
    expect(preview).toEqual([]);
  });

  it("returns a single date for ONE_TIME", () => {
    const preview = previewUpcomingOccurrences(
      { frequency: "ONE_TIME", nextRunAt: d("2026-01-01"), endAt: null },
      5,
    );
    expect(preview).toEqual([d("2026-01-01")]);
  });
});

describe("findBudgetForOccurrence", () => {
  const budget = (
    id: string,
    startAt: string,
    endAt: string,
    status: BudgetWindow["status"] = "ACTIVE",
  ): BudgetWindow => ({ id, startAt: d(startAt), endAt: d(endAt), status });

  it("finds the budget whose range contains the occurrence date", () => {
    const budgets = [
      budget("jan", "2026-01-01", "2026-01-31"),
      budget("feb", "2026-02-01", "2026-02-28"),
    ];
    expect(findBudgetForOccurrence(d("2026-02-15"), budgets)?.id).toBe("feb");
  });

  it("returns null when no active budget covers the date", () => {
    const budgets = [budget("jan", "2026-01-01", "2026-01-31")];
    expect(findBudgetForOccurrence(d("2026-03-01"), budgets)).toBeNull();
  });

  it("ignores non-ACTIVE budgets even if their range covers the date", () => {
    const budgets = [
      budget("archived", "2026-01-01", "2026-12-31", "ARCHIVED"),
    ];
    expect(findBudgetForOccurrence(d("2026-06-01"), budgets)).toBeNull();
  });

  it("picks the latest-starting budget when ranges overlap", () => {
    const budgets = [
      budget("old", "2026-01-01", "2026-12-31"),
      budget("new", "2026-06-01", "2026-12-31"),
    ];
    expect(findBudgetForOccurrence(d("2026-07-01"), budgets)?.id).toBe("new");
  });

  it("treats boundary dates as inclusive", () => {
    const budgets = [budget("jan", "2026-01-01", "2026-01-31")];
    expect(findBudgetForOccurrence(d("2026-01-01"), budgets)?.id).toBe("jan");
    expect(findBudgetForOccurrence(d("2026-01-31"), budgets)?.id).toBe("jan");
  });
});
