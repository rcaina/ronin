import { CardType, TransactionType, type CategoryType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateCategoryBreakdown,
  calculateGroupSplitOverTime,
  calculateIncomeVsSpendingOverTime,
  calculateReportComparison,
  calculateReportSummary,
  calculateSpendingOverTime,
  deriveWindowFromBudgets,
  generateReportBuckets,
  pickGranularity,
  previousWindow,
  type ReportBudget,
  type ReportCategory,
} from "@/lib/utils/reports";
import type { SpendingTransaction } from "@/lib/utils/spending";

const tx = (
  transactionType: TransactionType,
  amount: number,
  overrides: Partial<SpendingTransaction> = {},
): SpendingTransaction => ({ transactionType, amount, ...overrides });

const category = (
  id: string,
  name: string,
  group: CategoryType,
  transactions: SpendingTransaction[] = [],
): ReportCategory => ({ id, name, group, transactions });

const budget = (overrides: Partial<ReportBudget> = {}): ReportBudget => ({
  id: "budget-1",
  startAt: new Date(2026, 0, 1),
  endAt: new Date(2026, 11, 31),
  categories: [],
  transactions: [],
  cards: [],
  ...overrides,
});

describe("pickGranularity", () => {
  it("picks daily buckets for a short window", () => {
    expect(
      pickGranularity({
        start: new Date("2026-06-01"),
        end: new Date("2026-06-10"),
      }),
    ).toBe("day");
  });

  it("picks weekly buckets for a multi-month window", () => {
    expect(
      pickGranularity({
        start: new Date("2026-01-01"),
        end: new Date("2026-04-01"),
      }),
    ).toBe("week");
  });

  it("picks monthly buckets for a year-long window", () => {
    expect(
      pickGranularity({
        start: new Date("2025-07-01"),
        end: new Date("2026-07-01"),
      }),
    ).toBe("month");
  });
});

describe("generateReportBuckets", () => {
  it("generates one bucket per day, inclusive of both ends", () => {
    const buckets = generateReportBuckets(
      { start: new Date(2026, 5, 1), end: new Date(2026, 5, 3) },
      "day",
    );
    expect(buckets).toHaveLength(3);
    expect(buckets[0]!.label).toBe("Jun 1");
    expect(buckets[2]!.label).toBe("Jun 3");
  });

  it("generates monthly buckets spanning a year", () => {
    const buckets = generateReportBuckets(
      { start: new Date("2026-01-15"), end: new Date("2026-12-15") },
      "month",
    );
    expect(buckets).toHaveLength(12);
  });
});

describe("calculateSpendingOverTime", () => {
  it("buckets REGULAR spending and lets RETURN reduce it within a bucket", () => {
    const b = budget({
      categories: [
        category("c1", "Groceries", "NEEDS", [
          tx(TransactionType.REGULAR, 100, {
            occurredAt: new Date(2026, 5, 1),
          }),
          tx(TransactionType.RETURN, 20, { occurredAt: new Date(2026, 5, 1) }),
          tx(TransactionType.REGULAR, 50, { occurredAt: new Date(2026, 5, 2) }),
        ]),
      ],
    });

    const points = calculateSpendingOverTime(
      [b],
      { start: new Date(2026, 5, 1), end: new Date(2026, 5, 2) },
      "day",
    );

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ label: "Jun 1", spending: 80 });
    expect(points[1]).toMatchObject({ label: "Jun 2", spending: 50 });
  });

  it("excludes INCOME and CARD_PAYMENT transactions from spending", () => {
    const b = budget({
      categories: [
        category("c1", "Groceries", "NEEDS", [
          tx(TransactionType.REGULAR, 30, { occurredAt: "2026-06-01" }),
        ]),
      ],
      transactions: [
        tx(TransactionType.INCOME, 1000, {
          occurredAt: "2026-06-01",
          cardId: "card-1",
        }),
        tx(TransactionType.CARD_PAYMENT, 200, { occurredAt: "2026-06-01" }),
      ],
    });

    const points = calculateSpendingOverTime(
      [b],
      { start: new Date("2026-06-01"), end: new Date("2026-06-01") },
      "day",
    );

    expect(points[0]!.spending).toBe(30);
  });
});

describe("calculateCategoryBreakdown", () => {
  it("sums spend per category across budgets and sorts highest first", () => {
    const b1 = budget({
      id: "b1",
      categories: [
        category("c1", "Groceries", "NEEDS", [tx(TransactionType.REGULAR, 40)]),
        category("c2", "Dining", "WANTS", [tx(TransactionType.REGULAR, 100)]),
      ],
    });
    const b2 = budget({
      id: "b2",
      categories: [
        category("c1", "Groceries", "NEEDS", [tx(TransactionType.REGULAR, 20)]),
      ],
    });

    const breakdown = calculateCategoryBreakdown([b1, b2], null);

    expect(breakdown).toEqual([
      { categoryId: "c2", name: "Dining", group: "WANTS", amount: 100 },
      { categoryId: "c1", name: "Groceries", group: "NEEDS", amount: 60 },
    ]);
  });

  it("omits categories with zero or net-negative (fully refunded) spend", () => {
    const b = budget({
      categories: [
        category("c1", "Refunded", "WANTS", [
          tx(TransactionType.REGULAR, 20),
          tx(TransactionType.RETURN, 30),
        ]),
        category("c2", "Untouched", "NEEDS", []),
      ],
    });

    expect(calculateCategoryBreakdown([b], null)).toEqual([]);
  });
});

describe("calculateGroupSplitOverTime", () => {
  it("splits spending per bucket by category group", () => {
    const b = budget({
      categories: [
        category("c1", "Rent", "NEEDS", [
          tx(TransactionType.REGULAR, 100, { occurredAt: "2026-06-01" }),
        ]),
        category("c2", "Movies", "WANTS", [
          tx(TransactionType.REGULAR, 25, { occurredAt: "2026-06-01" }),
        ]),
        category("c3", "Stocks", "INVESTMENT", [
          tx(TransactionType.REGULAR, 10, { occurredAt: "2026-06-01" }),
        ]),
      ],
    });

    const points = calculateGroupSplitOverTime(
      [b],
      { start: new Date("2026-06-01"), end: new Date("2026-06-01") },
      "day",
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      NEEDS: 100,
      WANTS: 25,
      INVESTMENT: 10,
    });
  });
});

describe("calculateIncomeVsSpendingOverTime", () => {
  it("counts INCOME only on debit/business-debit cards, per bucket", () => {
    const b = budget({
      cards: [
        { id: "debit-1", cardType: CardType.DEBIT },
        { id: "credit-1", cardType: CardType.CREDIT },
      ],
      categories: [
        category("c1", "Groceries", "NEEDS", [
          tx(TransactionType.REGULAR, 40, { occurredAt: "2026-06-01" }),
        ]),
      ],
      transactions: [
        tx(TransactionType.INCOME, 500, {
          occurredAt: "2026-06-01",
          cardId: "debit-1",
        }),
        // INCOME on a credit card doesn't count as household income.
        tx(TransactionType.INCOME, 999, {
          occurredAt: "2026-06-01",
          cardId: "credit-1",
        }),
      ],
    });

    const points = calculateIncomeVsSpendingOverTime(
      [b],
      { start: new Date("2026-06-01"), end: new Date("2026-06-01") },
      "day",
    );

    expect(points[0]).toMatchObject({ income: 500, spending: 40 });
  });
});

describe("calculateReportSummary", () => {
  it("computes income, spending, net, and savings rate", () => {
    const b = budget({
      cards: [{ id: "debit-1", cardType: CardType.DEBIT }],
      categories: [
        category("c1", "Groceries", "NEEDS", [
          tx(TransactionType.REGULAR, 300),
        ]),
      ],
      transactions: [tx(TransactionType.INCOME, 1000, { cardId: "debit-1" })],
    });

    expect(calculateReportSummary([b], null)).toEqual({
      income: 1000,
      spending: 300,
      net: 700,
      savingsRate: 70,
    });
  });

  it("returns a 0 savings rate when there's no income", () => {
    const b = budget({
      categories: [
        category("c1", "Groceries", "NEEDS", [tx(TransactionType.REGULAR, 50)]),
      ],
    });

    expect(calculateReportSummary([b], null).savingsRate).toBe(0);
  });
});

describe("previousWindow", () => {
  it("returns an equal-duration window immediately before the given one", () => {
    const window = {
      start: new Date("2026-06-01"),
      end: new Date("2026-06-30"),
    };
    const prior = previousWindow(window);

    expect(prior.end.getTime()).toBe(window.start.getTime() - 1);
    expect(prior.end.getTime() - prior.start.getTime()).toBe(
      window.end.getTime() - window.start.getTime(),
    );
  });
});

describe("calculateReportComparison", () => {
  it("computes current/previous summaries and percent changes", () => {
    const b = budget({
      cards: [{ id: "debit-1", cardType: CardType.DEBIT }],
      categories: [
        category("c1", "Groceries", "NEEDS", [
          tx(TransactionType.REGULAR, 200, { occurredAt: "2026-06-15" }),
          tx(TransactionType.REGULAR, 100, { occurredAt: "2026-05-15" }),
        ]),
      ],
      transactions: [
        tx(TransactionType.INCOME, 1000, {
          occurredAt: "2026-06-15",
          cardId: "debit-1",
        }),
        tx(TransactionType.INCOME, 1000, {
          occurredAt: "2026-05-15",
          cardId: "debit-1",
        }),
      ],
    });

    const current = {
      start: new Date("2026-06-01"),
      end: new Date("2026-06-30"),
    };
    const previous = {
      start: new Date("2026-05-01"),
      end: new Date("2026-05-31"),
    };

    const comparison = calculateReportComparison([b], current, previous);

    expect(comparison.current.spending).toBe(200);
    expect(comparison.previous.spending).toBe(100);
    expect(comparison.spendingChangePct).toBe(100);
    expect(comparison.incomeChangePct).toBe(0);
  });

  it("returns null percent change when the previous period is 0", () => {
    const b = budget({
      categories: [
        category("c1", "Groceries", "NEEDS", [
          tx(TransactionType.REGULAR, 50, { occurredAt: "2026-06-15" }),
        ]),
      ],
    });

    const comparison = calculateReportComparison(
      [b],
      { start: new Date("2026-06-01"), end: new Date("2026-06-30") },
      { start: new Date("2026-05-01"), end: new Date("2026-05-31") },
    );

    expect(comparison.spendingChangePct).toBeNull();
    expect(comparison.incomeChangePct).toBeNull();
  });
});

describe("deriveWindowFromBudgets", () => {
  it("spans the min startAt and max endAt across budgets", () => {
    const window = deriveWindowFromBudgets([
      { startAt: new Date("2026-02-01"), endAt: new Date("2026-02-28") },
      { startAt: new Date("2026-01-01"), endAt: new Date("2026-01-31") },
    ]);

    expect(window.start).toEqual(new Date("2026-01-01"));
    expect(window.end).toEqual(new Date("2026-02-28"));
  });

  it("falls back to the last N days when there are no budgets", () => {
    const window = deriveWindowFromBudgets([], 10);
    const days = Math.round(
      (window.end.getTime() - window.start.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(days).toBe(10);
  });
});
