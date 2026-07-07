import { describe, expect, it } from "vitest";
import {
  BUDGET_PERIOD_ENDING_WINDOW_DAYS,
  CATEGORY_SPEND_THRESHOLD_RATIO,
  dedupeNotificationTargets,
  evaluateBudgetPeriodEnding,
  evaluateCategoryThreshold,
  evaluateRecurringPosted,
  notificationIdentityKey,
  type NotificationTarget,
} from "@/lib/utils/notifications";

describe("evaluateCategoryThreshold", () => {
  const base = {
    categoryId: "cat_1",
    categoryName: "Groceries",
    budgetId: "budget_1",
    allocatedAmount: 100,
    spent: 0,
  };

  it("returns null when spend is below the threshold", () => {
    expect(evaluateCategoryThreshold({ ...base, spent: 89.99 })).toBeNull();
  });

  it("fires at exactly the threshold ratio", () => {
    const result = evaluateCategoryThreshold({
      ...base,
      spent: 100 * CATEGORY_SPEND_THRESHOLD_RATIO,
    });
    expect(result).not.toBeNull();
    expect(result?.type).toBe("CATEGORY_OVER_THRESHOLD");
  });

  it("fires when spend exceeds the allocated amount", () => {
    const result = evaluateCategoryThreshold({ ...base, spent: 150 });
    expect(result).not.toBeNull();
    expect(result?.body).toContain("150%");
  });

  it("returns null when there is no allocation", () => {
    expect(
      evaluateCategoryThreshold({ ...base, allocatedAmount: null, spent: 500 }),
    ).toBeNull();
  });

  it("returns null when the allocation is zero or negative", () => {
    expect(
      evaluateCategoryThreshold({ ...base, allocatedAmount: 0, spent: 10 }),
    ).toBeNull();
    expect(
      evaluateCategoryThreshold({ ...base, allocatedAmount: -50, spent: 10 }),
    ).toBeNull();
  });

  it("derives a dedupe key scoped to the category only", () => {
    const result = evaluateCategoryThreshold({ ...base, spent: 95 });
    expect(result?.dedupeKey).toBe("CATEGORY_OVER_THRESHOLD:cat_1");
  });

  it("is idempotent — evaluating the same input twice yields the same key", () => {
    const first = evaluateCategoryThreshold({ ...base, spent: 95 });
    const second = evaluateCategoryThreshold({ ...base, spent: 95 });
    expect(first?.dedupeKey).toEqual(second?.dedupeKey);
  });

  it("derives different keys for different categories", () => {
    const a = evaluateCategoryThreshold({ ...base, spent: 95 });
    const b = evaluateCategoryThreshold({
      ...base,
      categoryId: "cat_2",
      spent: 95,
    });
    expect(a?.dedupeKey).not.toEqual(b?.dedupeKey);
  });
});

describe("evaluateBudgetPeriodEnding", () => {
  const now = new Date("2026-07-06T00:00:00Z");
  const base = {
    budgetId: "budget_1",
    budgetName: "July budget",
    now,
  };

  it("returns null when the period ends further out than the window", () => {
    const endAt = new Date(now.getTime());
    endAt.setUTCDate(endAt.getUTCDate() + BUDGET_PERIOD_ENDING_WINDOW_DAYS + 1);
    expect(evaluateBudgetPeriodEnding({ ...base, endAt })).toBeNull();
  });

  it("fires exactly at the edge of the window", () => {
    const endAt = new Date(now.getTime());
    endAt.setUTCDate(endAt.getUTCDate() + BUDGET_PERIOD_ENDING_WINDOW_DAYS);
    const result = evaluateBudgetPeriodEnding({ ...base, endAt });
    expect(result).not.toBeNull();
    expect(result?.type).toBe("BUDGET_PERIOD_ENDING");
  });

  it("fires when the period ends today", () => {
    const result = evaluateBudgetPeriodEnding({ ...base, endAt: now });
    expect(result).not.toBeNull();
  });

  it("returns null once the period has already ended", () => {
    const endAt = new Date(now.getTime());
    endAt.setUTCDate(endAt.getUTCDate() - 1);
    expect(evaluateBudgetPeriodEnding({ ...base, endAt })).toBeNull();
  });

  it("derives a dedupe key scoped to the budget only", () => {
    const result = evaluateBudgetPeriodEnding({ ...base, endAt: now });
    expect(result?.dedupeKey).toBe("BUDGET_PERIOD_ENDING:budget_1");
  });
});

describe("evaluateRecurringPosted", () => {
  it("always returns a candidate", () => {
    const result = evaluateRecurringPosted({
      recurringTransactionId: "rec_1",
      name: "Rent",
      amount: 1200,
      occurredAt: new Date("2026-07-01T00:00:00Z"),
    });
    expect(result.type).toBe("RECURRING_POSTED");
    expect(result.body).toContain("Rent");
  });

  it("falls back to a generic name when none is set", () => {
    const result = evaluateRecurringPosted({
      recurringTransactionId: "rec_1",
      name: null,
      amount: 50,
      occurredAt: new Date("2026-07-01T00:00:00Z"),
    });
    expect(result.body).toContain("A recurring transaction");
  });

  it("derives a dedupe key scoped to the template and occurrence date", () => {
    const occurredAt = new Date("2026-07-01T00:00:00Z");
    const first = evaluateRecurringPosted({
      recurringTransactionId: "rec_1",
      name: "Rent",
      amount: 1200,
      occurredAt,
    });
    const second = evaluateRecurringPosted({
      recurringTransactionId: "rec_1",
      name: "Rent",
      amount: 1200,
      occurredAt,
    });
    expect(first.dedupeKey).toEqual(second.dedupeKey);

    const laterOccurrence = evaluateRecurringPosted({
      recurringTransactionId: "rec_1",
      name: "Rent",
      amount: 1200,
      occurredAt: new Date("2026-08-01T00:00:00Z"),
    });
    expect(laterOccurrence.dedupeKey).not.toEqual(first.dedupeKey);
  });
});

describe("dedupeNotificationTargets", () => {
  const makeTarget = (
    userId: string,
    dedupeKey: string,
  ): NotificationTarget => ({
    userId,
    candidate: {
      type: "CATEGORY_OVER_THRESHOLD",
      title: "t",
      body: "b",
      dedupeKey,
    },
  });

  it("drops targets whose identity already exists", () => {
    const targets = [makeTarget("u1", "k1"), makeTarget("u1", "k2")];
    const existing = new Set([notificationIdentityKey(targets[0]!)]);

    const result = dedupeNotificationTargets(targets, existing);

    expect(result).toHaveLength(1);
    expect(result[0]?.candidate.dedupeKey).toBe("k2");
  });

  it("collapses duplicate targets within the same batch", () => {
    const targets = [
      makeTarget("u1", "k1"),
      makeTarget("u1", "k1"),
      makeTarget("u2", "k1"),
    ];

    const result = dedupeNotificationTargets(targets, new Set());

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.userId).sort()).toEqual(["u1", "u2"]);
  });

  it("is a no-op when nothing exists and there are no duplicates", () => {
    const targets = [makeTarget("u1", "k1"), makeTarget("u2", "k1")];
    const result = dedupeNotificationTargets(targets, new Set());
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when every target already exists", () => {
    const targets = [makeTarget("u1", "k1")];
    const existing = new Set([notificationIdentityKey(targets[0]!)]);
    expect(dedupeNotificationTargets(targets, existing)).toEqual([]);
  });
});
