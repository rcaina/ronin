import { TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getMonthWindow,
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
