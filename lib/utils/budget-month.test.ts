import { TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateReadyToAssign,
  computeCarry,
  computeQuickFill,
  getMonthWindow,
  type QuickFillCategory,
  parseMonthKey,
  projectCategoryToMonth,
  shiftMonth,
  toMonthKey,
} from "@/lib/utils/budget-month";

describe("parseMonthKey", () => {
  it("accepts YYYY-MM", () => {
    expect(parseMonthKey("2026-11")).toBe("2026-11");
  });

  it("rejects malformed or out-of-range keys", () => {
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("2026-1")).toBeNull();
    expect(parseMonthKey(null)).toBeNull();
  });
});

describe("toMonthKey", () => {
  it("uses the UTC month, not local time", () => {
    expect(toMonthKey(new Date("2026-11-30T23:59:59.999Z"))).toBe("2026-11");
    expect(toMonthKey(new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12");
  });
});

describe("getMonthWindow", () => {
  it("spans the first to the last millisecond of the month", () => {
    const { start, end } = getMonthWindow("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries both ways", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("projectCategoryToMonth", () => {
  const regular = (date: string, occurred = true) => ({
    transactionType: TransactionType.REGULAR,
    amount: 10,
    occurredAt: occurred ? date : null,
    createdAt: date,
  });

  it("keeps transactions and split legs dated in the month, falling back to createdAt", () => {
    const category = {
      transactions: [
        regular("2026-10-31T23:59:59.999Z"),
        regular("2026-11-01T00:00:00.000Z"),
        regular("2026-11-15T12:00:00.000Z", false),
      ],
      transactionSplits: [
        { amount: 5, transaction: regular("2026-11-20T00:00:00.000Z") },
        { amount: 5, transaction: regular("2026-12-01T00:00:00.000Z") },
      ],
    };

    const projected = projectCategoryToMonth(
      category,
      getMonthWindow("2026-11"),
    );

    expect(projected.transactions).toHaveLength(2);
    expect(projected.transactionSplits).toHaveLength(1);
  });
});

describe("projectCategoryToMonth planned amount", () => {
  const window = getMonthWindow("2026-11");

  it("uses the month's assigned amount, including zero", () => {
    expect(
      projectCategoryToMonth({ allocatedAmount: 300 }, window, 450)
        .allocatedAmount,
    ).toBe(450);
    expect(
      projectCategoryToMonth({ allocatedAmount: 300 }, window, 0)
        .allocatedAmount,
    ).toBe(0);
  });

  it("falls back to the category default when the month has no row", () => {
    expect(
      projectCategoryToMonth({ allocatedAmount: 300 }, window).allocatedAmount,
    ).toBe(300);
  });
});

describe("computeQuickFill", () => {
  const spend = (
    date: string,
    amount: number,
    type: TransactionType = TransactionType.REGULAR,
  ) => ({
    transactionType: type,
    amount,
    occurredAt: date,
    createdAt: date,
  });
  const category = (
    overrides: Partial<QuickFillCategory> = {},
  ): QuickFillCategory => ({
    id: "groceries",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    allocatedAmount: 300,
    months: [],
    transactions: [],
    ...overrides,
  });

  it("copies last month's plan, falling back to the default", () => {
    const withRow = category({
      months: [{ month: new Date("2026-10-01T00:00:00.000Z"), assigned: 450 }],
    });
    const withoutRow = category({ id: "fuel" });

    const fill = computeQuickFill(
      "last-month",
      [withRow, withoutRow],
      "2026-11",
    );

    expect(fill.get("groceries")).toBe(450);
    expect(fill.get("fuel")).toBe(300);
  });

  it("uses last month's net spending, never below zero", () => {
    const spent = category({
      transactions: [
        spend("2026-10-31T23:59:59.999Z", 120.5),
        spend("2026-10-10T00:00:00.000Z", 20.25, TransactionType.RETURN),
        spend("2026-11-01T00:00:00.000Z", 999),
      ],
    });
    const refunded = category({
      id: "fuel",
      transactions: [
        spend("2026-10-05T00:00:00.000Z", 40, TransactionType.RETURN),
      ],
    });

    const fill = computeQuickFill("last-actual", [spent, refunded], "2026-11");

    expect(fill.get("groceries")).toBe(100.25);
    expect(fill.get("fuel")).toBe(0);
  });

  it("averages spending over the last 3 months the category existed", () => {
    const old = category({
      transactions: [
        spend("2026-08-15T00:00:00.000Z", 100),
        spend("2026-09-15T00:00:00.000Z", 200),
        spend("2026-10-15T00:00:00.000Z", 301),
      ],
    });
    const newer = category({
      id: "fuel",
      createdAt: new Date("2026-09-20T00:00:00.000Z"),
      transactions: [spend("2026-10-15T00:00:00.000Z", 50)],
    });

    const fill = computeQuickFill("average-3", [old, newer], "2026-11");

    expect(fill.get("groceries")).toBe(200.33);
    expect(fill.get("fuel")).toBe(25);
  });

  it("leaves out categories with no history before the month", () => {
    const createdThisMonth = category({
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
    });
    const spentBeforeCreated = category({
      id: "fuel",
      createdAt: new Date("2026-11-02T00:00:00.000Z"),
      transactions: [spend("2026-10-20T00:00:00.000Z", 60)],
    });

    for (const source of ["last-month", "average-3", "last-actual"] as const) {
      const fill = computeQuickFill(
        source,
        [createdThisMonth, spentBeforeCreated],
        "2026-11",
      );
      expect(fill.has("groceries")).toBe(false);
      expect(fill.has("fuel")).toBe(true);
    }
  });
});

describe("computeCarry", () => {
  const spend = (date: string, amount: number) => ({
    transactionType: TransactionType.REGULAR,
    amount,
    occurredAt: date,
    createdAt: date,
  });
  const category = (
    overrides: Partial<Parameters<typeof computeCarry>[0]> = {},
  ): Parameters<typeof computeCarry>[0] => ({
    id: "groceries",
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    allocatedAmount: 300,
    rollover: true,
    months: [],
    transactions: [],
    ...overrides,
  });

  it("carries nothing when rollover is off", () => {
    const off = category({
      rollover: false,
      transactions: [spend("2026-09-15T00:00:00.000Z", 100)],
    });

    expect(computeCarry(off, "2026-11")).toBe(0);
  });

  it("carries nothing into the category's first month", () => {
    expect(computeCarry(category(), "2026-09")).toBe(0);
  });

  it("adds planned minus spent for each earlier month, using the month's plan over the default", () => {
    const groceries = category({
      months: [{ month: new Date("2026-10-01T00:00:00.000Z"), assigned: 150 }],
      transactions: [
        spend("2026-09-15T00:00:00.000Z", 100),
        spend("2026-10-15T00:00:00.000Z", 250),
        spend("2026-11-02T00:00:00.000Z", 999),
      ],
    });

    // Sep: 300 - 100 = +200; Oct: 150 - 250 = -100; Nov is the viewed month.
    expect(computeCarry(groceries, "2026-11")).toBe(100);
  });

  it("carries a negative balance after overspending", () => {
    const overspent = category({
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      transactions: [spend("2026-10-20T00:00:00.000Z", 350)],
    });

    expect(computeCarry(overspent, "2026-11")).toBe(-50);
  });

  it("starts at the earliest transaction when it predates the category", () => {
    const backdated = category({
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
      transactions: [spend("2026-10-20T00:00:00.000Z", 50)],
    });

    expect(computeCarry(backdated, "2026-11")).toBe(250);
  });
});

describe("calculateReadyToAssign", () => {
  it("is income minus planned, negative when over-planned", () => {
    const planned = [{ allocatedAmount: 1200 }, { allocatedAmount: null }];

    expect(calculateReadyToAssign(2000.5, planned)).toBe(800.5);
    expect(calculateReadyToAssign(1000, planned)).toBe(-200);
  });
});
